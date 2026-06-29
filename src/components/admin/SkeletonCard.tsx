// SkeletonCard — shimmer loader, remplace le spinner générique pendant le chargement.
export function SkeletonCard() {
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg, #EDE7DC 25%, rgba(237,231,220,.6) 50%, #EDE7DC 75%)',
    backgroundSize: '600px 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius: '3px',
  }
  return (
    <div style={{
      background: '#EDE7DC', border: '1px solid rgba(26,20,16,.07)',
      borderRadius: '1.1rem', padding: '3px',
      boxShadow: '0 1px 0 rgba(255,255,255,.65) inset, var(--shadow-card)',
    }}>
      <div style={{ background: '#fff', borderRadius: 'calc(1.1rem - 3px)', overflow: 'hidden' }}>
        {/* Photo zone */}
        <div style={{ ...sk, height: '110px', borderRadius: 0 }} />
        {/* Footer */}
        <div style={{ padding: '.5rem .6rem .48rem', borderTop: '1px solid rgba(26,20,16,.07)', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          <div style={{ ...sk, height: '9px', width: '70%' }} />
          <div style={{ ...sk, height: '7px', width: '50%' }} />
          <div style={{ ...sk, height: '7px', width: '40%' }} />
          <div style={{ display: 'flex', gap: '.22rem' }}>
            <div style={{ ...sk, height: '14px', width: '40px', borderRadius: '100px' }} />
            <div style={{ ...sk, height: '14px', width: '34px', borderRadius: '100px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
