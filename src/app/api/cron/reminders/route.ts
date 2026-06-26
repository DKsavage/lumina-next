// GET /api/cron/reminders — rappels automatiques quotidiens.
// Appelé par Vercel Cron à 13h UTC (9h EDT / 8h EST Montréal).
// Auth : Authorization: Bearer ${CRON_SECRET} (injecté automatiquement par Vercel).
// Anti-doublon : reminder_*_sent_at dans session_models (déjà en place).
import { NextRequest, NextResponse } from 'next/server'
import { buildReminderHtml, sentAtField } from '@/app/api/sessions/remind/route'

type AutoType = 'j5' | 'j2' | 'j1' | 'morning'

// 'sv-SE' retourne toujours YYYY-MM-DD — format ISO date sans heure
function toISODate(d: Date) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Montreal' })
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = toISODate(new Date())
  const dateMap: Record<AutoType, string> = {
    morning: today,
    j1:      addDays(today, 1),
    j2:      addDays(today, 2),
    j5:      addDays(today, 5),
  }

  const url     = process.env.SUPABASE_URL!
  const key     = process.env.SUPABASE_SERVICE_KEY!
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }

  // Toutes les sessions dont la date correspond à l'un des 4 jalons
  const targetDates = [...new Set(Object.values(dateMap))].join(',')
  const sRes = await fetch(
    `${url}/rest/v1/sessions?date=in.(${targetDates})&select=id,project,date,address,contact_name,contact_phone,compensation_json`,
    { headers }
  )
  if (!sRes.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const sessions = await sRes.json() as Array<{
    id:               string
    project:          string
    date:             string
    address:          string
    contact_name:     string | null
    contact_phone:    string | null
    compensation_json: { type: string; amount: string | null; payment_method: string | null; delay: string | null } | null
  }>

  if (!sessions.length) return NextResponse.json({ success: true, sent: 0, sessions: 0 })

  let totalSent = 0, totalFailed = 0

  for (const session of sessions) {
    const type = (Object.entries(dateMap) as [AutoType, string][])
      .find(([, d]) => d === session.date)?.[0]
    if (!type) continue

    const sentField    = sentAtField(type)
    const targetStatus = (type === 'j1' || type === 'morning') ? 'confirmed' : 'pending'

    const mRes = await fetch(
      `${url}/rest/v1/session_models?session_id=eq.${session.id}&status=eq.${targetStatus}&${sentField}=is.null&select=id,model_prenom,model_email,token,group:session_groups(call_time)`,
      { headers }
    )
    if (!mRes.ok) continue

    const models = await mRes.json() as Array<{
      id:           string
      model_prenom: string
      model_email:  string
      token:        string
      group:        { call_time: string } | null
    }>
    if (!models.length) continue

    const comp    = session.compensation_json
    const results = await Promise.allSettled(
      models.map(async m => {
        const { subject, html } = buildReminderHtml(type, {
          prenom:             m.model_prenom,
          project:            session.project,
          date:               session.date,
          address:            session.address,
          callTime:           m.group?.call_time ?? null,
          contactName:        session.contact_name,
          contactPhone:       session.contact_phone,
          token:              m.token,
          compensationAmount: comp?.amount ?? null,
          compensationMethod: comp?.payment_method ?? null,
          compensationDelay:  comp?.delay ?? null,
        })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY!}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Lumina Photography <casting@luminamodels.ca>',
            to:   [m.model_email],
            subject,
            html,
          }),
        })
        if (!res.ok) throw new Error(`Resend ${res.status}`)

        const pRes = await fetch(`${url}/rest/v1/session_models?id=eq.${m.id}`, {
          method:  'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ [sentField]: new Date().toISOString() }),
        })
        if (!pRes.ok) throw new Error('PATCH sent_at failed')
      })
    )

    totalSent   += results.filter(r => r.status === 'fulfilled').length
    totalFailed += results.filter(r => r.status === 'rejected').length
  }

  return NextResponse.json({ success: true, sent: totalSent, failed: totalFailed, sessions: sessions.length })
}
