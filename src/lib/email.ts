// Helpers partagés pour tous les templates d'emails HTML.
// Inline styles uniquement — les clients email n'acceptent pas les feuilles CSS externes.

export function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Boutons CTA empilés verticalement, pleine largeur, sans border-radius.
// Le bouton secondaire (annuler) est optionnel et toujours moins saillant.
export function buildCtaButtons(opts: {
  primaryLabel:    string
  primaryUrl:      string
  secondaryLabel?: string
  secondaryUrl?:   string
}): string {
  const primary = `<tr><td>
    <a href="${opts.primaryUrl}" style="display:block;background:#8B0020;color:#ffffff;padding:16px;font-size:16px;font-weight:700;text-align:center;text-decoration:none;font-family:Arial,sans-serif;">${opts.primaryLabel}</a>
  </td></tr>`
  const secondary = opts.secondaryLabel && opts.secondaryUrl
    ? `<tr><td style="padding-top:10px;">
        <a href="${opts.secondaryUrl}" style="display:block;background:#ffffff;color:#6B6B6B;padding:14px;font-size:14px;text-align:center;text-decoration:none;border:1px solid #E0E0E0;font-family:Arial,sans-serif;">${opts.secondaryLabel}</a>
      </td></tr>`
    : ''
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${primary}${secondary}</table>`
}

// Label Georgia uppercase + ligne fine rgba(139,0,32,0.12) + valeur HTML optionnelle.
// Passer valueHtml=undefined pour n'afficher que le label+ligne (ex: avant un tableau de groupes).
export function buildInfoBlock(label: string, valueHtml?: string): string {
  const value = valueHtml != null
    ? `<div style="margin:0;font-size:16px;color:#0A0A0A;line-height:1.8;font-family:Arial,sans-serif;">${valueHtml}</div>`
    : ''
  return `<p style="margin:24px 0 0;font-size:10px;font-family:Georgia,serif;letter-spacing:0.2em;text-transform:uppercase;color:#6B6B6B;">${label}</p>
<div style="border-top:1px solid rgba(139,0,32,0.12);margin:6px 0 8px;"></div>${value}`
}

interface EmailWrapperOpts {
  projectName: string   // Titre principal du header (nom de projet ou "Félicitations")
  subLabel?:   string   // Ligne secondaire du header (type · date, ou type de rappel)
  bodyEn:      string   // HTML section EN — omis si chaîne vide
  bodyFr:      string   // HTML section FR — omis si chaîne vide
}

export function buildEmailWrapper(opts: EmailWrapperOpts): string {
  const { projectName, subLabel, bodyEn, bodyFr } = opts

  const langDivider = (lang: string) => `
    <tr><td style="padding:0 24px;">
      <p style="margin:24px 0 12px;font-size:9px;font-family:Georgia,serif;letter-spacing:0.22em;text-transform:uppercase;color:#8B0020;text-align:center;">· ${lang} ·</p>
      <div style="border-top:1px solid rgba(139,0,32,0.12);"></div>
    </td></tr>`

  const sectionEn = bodyEn
    ? `${langDivider('EN')}<tr><td style="padding:24px 24px 32px;">${bodyEn}</td></tr>`
    : ''
  const sectionFr = bodyFr
    ? `${langDivider('FR')}<tr><td style="padding:24px 24px 32px;">${bodyFr}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:24px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#8B0020;padding:32px 24px;">
    <p style="margin:0 0 16px;font-size:10px;font-family:Georgia,serif;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.7);">FLAWA MODELS</p>
    <p style="margin:0;font-size:26px;font-family:Georgia,serif;font-weight:700;color:#ffffff;line-height:1.2;">${esc(projectName)}</p>
    ${subLabel ? `<p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">${esc(subLabel)}</p>` : ''}
  </td></tr>
  ${sectionEn}
  ${sectionFr}
  <tr><td style="background:#F7F3EE;padding:24px;">
    <p style="margin:0 0 4px;font-size:13px;font-family:Georgia,serif;letter-spacing:0.12em;text-transform:uppercase;color:#8B0020;font-weight:700;">FLAWA MODELS</p>
    <p style="margin:0;font-size:12px;color:#6B6B6B;font-family:Arial,sans-serif;">casting@luminamodels.ca &nbsp;·&nbsp; luminamodels.ca &nbsp;·&nbsp; Montréal</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
