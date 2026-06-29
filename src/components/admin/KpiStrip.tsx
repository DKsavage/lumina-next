// KpiStrip — bande KPI unifiée 4 cellules. Remplace les 4 boîtes séparées dans la nav.
'use client'

interface KpiItem {
  label:   string
  value:   number
  accent?: boolean
  trend?:  string
}

interface Props { items: KpiItem[] }

export function KpiStrip({ items }: Props) {
  return (
    <div style={{
      display: 'flex',
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: '.85rem',
      overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(255,255,255,.9) inset, var(--shadow-card)',
    }}>
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            padding: '.6rem .7rem',
            position: 'relative',
            background: item.accent ? 'rgba(139,0,32,.03)' : undefined,
            borderLeft: i > 0 ? '1px solid var(--border)' : undefined,
          }}
        >
          {item.accent && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--red)' }} />
          )}
          <div style={{
            fontSize: '.38rem', letterSpacing: '.18em', fontWeight: 500,
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.3rem',
            display: 'flex', alignItems: 'center', gap: '.3rem',
          }}>
            {item.accent && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />}
            {item.label}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300, fontSize: '1.8rem', lineHeight: 1,
            color: item.accent ? 'var(--red)' : 'var(--ink)',
          }}>
            {item.value}
          </div>
          {item.trend && (
            <div style={{ fontSize: '.38rem', letterSpacing: '.1em', color: '#2E7D32', fontWeight: 500, marginTop: '2px' }}>
              {item.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
