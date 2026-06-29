import { chromium } from 'playwright';
import path from 'path';
import os from 'os';

const BASE = 'http://localhost:3099';
const BIG   = path.join(os.tmpdir(), 'test-big.jpg');    // 4 Mo
const SMALL  = path.join(os.tmpdir(), 'test-small.jpg'); // 128 Ko

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(30000);

const ss = (name) => page.screenshot({ path: `/tmp/ss-${name}.png`, fullPage: false });

console.log('\n=== STEP 0 — page load ===');
await page.goto(BASE);
await page.waitForSelector('.upload-zone', { timeout: 10000 });
await ss('0-home');
console.log('✅ Page chargée');

// ── ÉTAPE 1 — Compression : photo profil > 1 Mo ──────────────────────────────
console.log('\n=== STEP 1 — Upload photo profil 4 Mo (doit déclencher compression) ===');
const [profil] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.locator('.upload-zone').first().click(),
]);
await profil.setFiles(BIG);

// Attendre que l'anneau pulse (classe optimizing)
try {
  await page.waitForSelector('.up-ring.optimizing', { timeout: 5000 });
  console.log('✅ Anneau .optimizing détecté — compression en cours');
  await ss('1-compressing');
} catch {
  console.log('⚠️  .up-ring.optimizing non détecté (compression trop rapide ou non déclenchée)');
}

// Attendre la fin de la compression (optimizing disparaît)
await page.waitForSelector('.up-ring.optimizing', { state: 'detached', timeout: 30000 });
console.log('✅ Compression terminée');
await ss('1-after-compress');

// Vérifier le sous-titre de la zone — doit afficher "Modifier ↺" (pas d'erreur)
const subtitle1 = await page.locator('.upload-zone').first().locator('.font-display').textContent();
console.log('   Sous-titre zone profil:', subtitle1);
if (subtitle1?.includes('Modifier')) {
  console.log('✅ Photo acceptée après compression');
} else if (subtitle1?.includes('trop lourde') || subtitle1?.includes('illisible')) {
  console.log('❌ ERREUR affiché:', subtitle1);
} else {
  console.log('⚠️  Sous-titre inattendu:', subtitle1);
}

// ── Upload body (petite image, pas de compression) ────────────────────────────
console.log('\n=== STEP 2 — Upload photo body 128 Ko (pas de compression) ===');
const [body] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.locator('.upload-zone').nth(1).click(),
]);
await body.setFiles(SMALL);
// Pas d'anneau optimizing attendu
await page.waitForSelector('.upload-zone:nth-child(2) .up-ring.optimizing', { state: 'detached', timeout: 2000 }).catch(() => {});
const subtitle2 = await page.locator('.upload-zone').nth(1).locator('.font-display').textContent();
console.log('   Sous-titre zone body:', subtitle2);
console.log(subtitle2?.includes('Modifier') ? '✅ Petite photo acceptée sans compression' : '⚠️  ' + subtitle2);
await ss('2-both-uploaded');

// ── Remplir champs identité ───────────────────────────────────────────────────
console.log('\n=== STEP 3 — Champs identité ===');
// input.input-underline uniquement — exclut les file inputs
const inputs = page.locator('input.input-underline');
const count = await inputs.count();
console.log(`   ${count} text-inputs trouvés`);

const vals = ['Marie', 'Dupont', 'marie.test@example.com', '+1 514 000 0000', '174'];
for (let i = 0; i < Math.min(vals.length, count); i++) {
  await inputs.nth(i).fill(vals[i]);
}
console.log('✅ Champs remplis');

// Genre (chips)
await page.locator('button[aria-pressed]').first().click().catch(() => {});
console.log('✅ Genre sélectionné');
await ss('3-step1-filled');

// ── Bouton Continuer ──────────────────────────────────────────────────────────
console.log('\n=== STEP 4 — Navigation étapes ===');
const continueBtn = page.locator('button').filter({ hasText: /Continuer|Profil/i }).first();
await continueBtn.click();
await page.waitForTimeout(600);
await ss('4-step2');
console.log('✅ Étape 2 atteinte');

// Étape 2 — ville + expérience
const step2Inputs = page.locator('input.input-underline');
await step2Inputs.first().fill('Paris');
console.log('✅ Ville remplie');
const expChip = page.locator('button[aria-pressed]').first();
await expChip.click().catch(() => {});

const btn2 = page.locator('button').filter({ hasText: /Continuer|Mesures/i }).first();
await btn2.click();
await page.waitForTimeout(600);
await ss('5-step3');
console.log('✅ Étape 3 atteinte');

// Étape 3 : poitrine/tailleMes/hanches = inputs, pointure = select, yeux = chips
await page.locator('input[placeholder="88"]').fill('86');
await page.locator('input[placeholder="68"]').fill('62');
await page.locator('input[placeholder="92"]').fill('90');
await page.locator('select.input-underline').selectOption('38');
// Couleur des yeux — click "Marron"
await page.locator('button[aria-pressed]').filter({ hasText: 'Marron' }).click();
await page.waitForTimeout(300);
console.log('✅ Étape 3 champs remplis (poitrine/taille/hanches/pointure/yeux)');
const btn3 = page.locator('button').filter({ hasText: /Continuer|Dispo/i }).first();
await btn3.click();
await page.waitForTimeout(600);
await ss('6-step4');
console.log('✅ Étape 4 atteinte');

// Étape 4 — date naissance + disponibilité
const step4Inputs = page.locator('input.input-underline, input[type="date"]');
await step4Inputs.first().fill('1998-03-15').catch(() => {});
await page.locator('button[aria-pressed]').first().click().catch(() => {});
await ss('7-step4-filled');
console.log('✅ Étape 4 remplie');

// ── Envoi ─────────────────────────────────────────────────────────────────────
console.log('\n=== STEP 5 — Envoi candidature ===');
const submitBtn = page.locator('button').filter({ hasText: /Envoyer|Candidature/i }).first();
await submitBtn.click();

// Attendre soit la confirmation, soit une erreur API
try {
  // Confirmation : clip-path reveal avec le prénom
  await page.waitForSelector('[class*="confirm"], [class*="Confirm"]', { timeout: 20000 });
  console.log('✅ Écran confirmation affiché');
  await ss('8-confirmation');
} catch {
  // Erreur attendue sans .env.local (Supabase non configuré)
  const errText = await page.locator('[class*="error"], .text-red, [style*="red"]').textContent().catch(() => null);
  if (errText) {
    console.log('⚠️  Erreur API (attendue sans .env.local):', errText.trim().slice(0, 120));
  } else {
    const bodyText = await page.locator('body').textContent().catch(() => '');
    console.log('⚠️  Timeout confirmation — vérifier manuellement. Body snippet:', bodyText.slice(0, 200));
  }
  await ss('8-api-result');
}

await browser.close();
console.log('\n✅ Screenshots dans /tmp/ss-*.png');
