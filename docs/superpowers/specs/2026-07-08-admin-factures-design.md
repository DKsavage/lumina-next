# Design — Page admin `/admin/factures`

Date : 2026-07-08

## Contexte

La facturation existe déjà partiellement : depuis `SessionStatusPanel`, l'admin
bascule un modèle confirmé sur "Rémunéré", ce qui active un lien vers
`/facture/{token}` — une page publique éditable par le modèle
(`src/app/facture/[token]/page.tsx` + `src/app/api/facture/[token]/route.ts`).

Ce qui manque : une vue admin listant toutes les factures. Le lien
"Factures" dans `AdminNav.tsx` pointe vers `href: '#'` — jamais implémenté.

Constat additionnel (dérive de schéma) : les colonnes `model_nom`, `role`,
`payment_amount` sont utilisées dans le code mais absentes de
`supabase-migration.sql`. Ce design corrige ça en documentant les colonnes
manquantes en même temps que les nouvelles.

## Objectifs

1. Lister toutes les factures envoyées, groupées **par session** ou **par
   modèle** (bascule).
2. Suivre un statut de facture : `pending` (En attente) / `sent` (Envoyée) /
   `paid` (Payée) — mis à jour manuellement par l'admin. Pas de détection
   automatique du retour de la facture signée : elle arrive dans la boîte
   Gmail personnelle de l'admin (`vidaflorita@gmail.com`), hors de portée de
   l'app. Décision explicite : on ne suit pas cet évènement dans l'app.
3. Numéro de facture séquentiel réel (remplace le dérivé-du-token actuel).
4. Adresse du modèle persistée et réutilisée d'une facture à l'autre.
5. Export CSV (lignes/colonnes, pas une seule ligne) + vue imprimable pour
   export groupé façon PDF.
6. Renvoyer l'email de facture directement depuis la liste.

## Modèle de données

### `candidatures` — nouvelle colonne

```sql
alter table candidatures add column if not exists adresse text;
```

L'adresse est liée au **modèle**, pas à une facture précise : une fois
saisie, elle pré-remplit toutes ses factures futures. Éditable à nouveau si
le modèle déménage — la nouvelle valeur écrase l'ancienne pour les
prochaines factures (pas d'historique de versions, hors scope).

### `session_models` — colonnes manquantes + nouvelles

```sql
-- Documentées ici car absentes de la migration existante bien qu'utilisées en prod :
alter table session_models add column if not exists model_nom       text;
alter table session_models add column if not exists role            text;
alter table session_models add column if not exists payment_amount  numeric;

-- Nouvelles pour ce design :
alter table session_models add column if not exists invoice_status  text default 'pending';
alter table session_models add column if not exists invoice_number  text unique;

alter table session_models add constraint session_models_invoice_status_check
  check (invoice_status in ('pending', 'sent', 'paid'));
```

### Compteur de numérotation

```sql
create table if not exists invoice_counters (
  year         int primary key,
  next_number  int not null default 1
);
```

Un trigger `BEFORE UPDATE ON session_models` assigne `invoice_number` la
première fois que `payment_amount` passe de `null` à une valeur non-nulle
(c'est le moment où la facture "existe" — quand l'admin bascule le toggle
Rémunéré) :

```sql
create or replace function assign_invoice_number() returns trigger as $$
declare
  yr int := extract(year from now());
  n  int;
begin
  if new.payment_amount is not null and old.payment_amount is null and new.invoice_number is null then
    insert into invoice_counters (year, next_number) values (yr, 2)
      on conflict (year) do update set next_number = invoice_counters.next_number + 1
      returning next_number - 1 into n;
    new.invoice_number := 'FLW-' || yr || '-' || lpad(n::text, 4, '0');
    new.invoice_status := 'sent';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger session_models_invoice_number
  before update on session_models
  for each row execute function assign_invoice_number();
```

Le statut passe automatiquement à `sent` au moment de l'assignation du
numéro (l'admin envoie l'email "Paiement" juste après avoir activé le
toggle, dans le workflow actuel). L'admin peut ensuite le repasser
manuellement à `paid`.

## Page facture existante — changements

`src/app/facture/[token]/page.tsx` :
- L'adresse se pré-remplit depuis `candidatures.adresse` (jointure ajoutée
  côté API).
- `onBlur` sur le champ adresse déclenche un nouveau `PATCH` qui écrit dans
  `candidatures.adresse` (et non plus un état local perdu au rechargement).
- Le numéro affiché devient `data.invoice_number` au lieu du dérivé du
  token.

`src/app/api/facture/[token]/route.ts` :
- `GET` : ajoute `candidatures.adresse` et `session_models.invoice_number`
  au `select`.
- `PATCH` : accepte optionnellement `{ adresse }` en plus de
  `{ payment_amount }`, et l'écrit sur la ligne `candidatures` correspondant
  au `model_email` de la facture.

## Nouvelle page `/admin/factures`

Fichier : `src/app/admin/factures/page.tsx` (suit le pattern des autres
pages admin : layout, auth via cookie httpOnly existant).

### Disposition

- Bascule **Par session / Par modèle** en haut (comme `DashboardFilters`).
- Barre de filtres : statut (select), plage de dates (deux inputs date),
  recherche texte (nom modèle ou projet).
- **Vue "Par session"** : une ligne par session (projet, date), expandable
  → sous-lignes par modèle facturé (rôle, montant, statut, actions).
- **Vue "Par modèle"** : une ligne par modèle (nom, email), expandable → ses
  factures à travers différentes sessions, plus un total cumulé payé.
- Par ligne de facture : badge de statut cliquable (cycle
  pending→sent→paid comme le toggle TFP/Rémunéré existant), lien "↗ Voir"
  vers `/facture/{token}`, bouton "Renvoyer" (icône email).
- Bouton "Exporter CSV" en haut, applique les filtres actifs.
- Bouton "Vue imprimable" ouvre `/admin/factures/print?<mêmes filtres>` —
  page dédiée, sans chrome admin, mise en page tabulaire pensée pour
  `window.print()` (pas de nouvelle librairie PDF, cohérent avec le pattern
  déjà utilisé sur `/facture/[token]`).

`AdminNav.tsx:50` : `{ label: 'Factures', href: '#' }` devient
`{ label: 'Factures', href: '/admin/factures' }`.

## API

### `GET /api/factures`

Query params : `groupBy=model|session` (défaut `session`), `status=`,
`from=`, `to=`, `q=`.

Retourne les lignes `session_models` jointes à `sessions` (projet, date) et
`candidatures` (nom, email), filtrées et groupées côté serveur selon
`groupBy`.

### `PATCH /api/factures/[session_model_id]`

Body : `{ invoice_status: 'pending' | 'sent' | 'paid' }`. Met à jour la
ligne `session_models` correspondante.

### `POST /api/factures/[session_model_id]/resend`

Renvoie l'email de facture au modèle. Réutilise les helpers d'email
existants (`buildEmailWrapper`, `buildCtaButtons` de `src/lib/email.ts`) et
le même template que le bouton "Envoyer Paiement" de `SessionStatusPanel`.

### `GET /api/factures/export`

Mêmes query params que `GET /api/factures`. Retourne un CSV
(`Content-Type: text/csv`) — **une ligne par facture, colonnes distinctes**
(pas tout sur une seule ligne) :

```
numero_facture,statut,modele_nom,modele_email,projet,date_session,montant,role
FLW-2026-0001,paid,Julie Tremblay,julie@example.com,Campagne Été,2026-06-12,450.00,Mannequin
FLW-2026-0002,sent,Marc Dubois,marc@example.com,Shooting Produit,2026-06-15,300.00,Mannequin
```

Génération via un simple assemblage de lignes `join(',')` avec échappement
des guillemets/virgules (pas de librairie CSV externe — le volume de
données ne le justifie pas).

## Hors scope (décisions explicites)

- Pas de détection automatique du retour de facture signée (arrive par
  email personnel, hors app).
- Pas d'historique de versions de l'adresse.
- Pas de table `invoices` séparée — le modèle reste 1:1 avec
  `session_models`, cohérent avec l'existant (un token = une facture).
- Pas de librairie de génération PDF serveur — la vue imprimable +
  `window.print()` suffit, comme la page facture actuelle.

## Fichiers impactés

- `supabase-migration.sql` (nouvelles colonnes + trigger + table compteur)
- `src/app/facture/[token]/page.tsx`
- `src/app/api/facture/[token]/route.ts`
- `src/app/admin/factures/page.tsx` (nouveau)
- `src/app/admin/factures/print/page.tsx` (nouveau)
- `src/app/api/factures/route.ts` (nouveau)
- `src/app/api/factures/[id]/route.ts` (nouveau, PATCH statut)
- `src/app/api/factures/[id]/resend/route.ts` (nouveau)
- `src/app/api/factures/export/route.ts` (nouveau)
- `src/components/admin/AdminNav.tsx` (lien `href`)
- `docs/GUIDE.md` (section 8, mise à jour)
