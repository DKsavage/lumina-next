'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()

  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState('')
  const [step,    setStep]    = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleEmail(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()

    setLoading(false)

    if (!data.success) {
      setError(data.message ?? 'Erreur inconnue.')
      return
    }

    setStep('otp')
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: code }),
    })
    const data = await res.json()

    setLoading(false)

    if (!data.success) {
      setError(data.message ?? 'Code invalide ou expiré.')
      return
    }

    // Le cookie httpOnly est posé par l'API — rien à stocker ici.
    router.push('/admin/dashboard')
  }

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center bg-paper px-6"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.028,
        }}
      />

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-14 text-center">
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: 'italic', fontSize: '2.2rem', letterSpacing: '-.01em', color: 'var(--ink)' }}
          >
            Flawa Models
          </span>
          <div
            className="mt-2 font-medium uppercase text-muted"
            style={{ fontSize: '.5rem', letterSpacing: '.4em' }}
          >
            Administration
          </div>
        </div>

        {/* Filet champagne */}
        <div
          className="mx-auto mb-10"
          style={{
            width: '2.5rem', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(196,160,90,.5), transparent)',
          }}
        />

        {/* Card */}
        <div
          className="bg-paper"
          style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}
        >
          {step === 'email' ? (
            <form onSubmit={handleEmail}>
              <label
                className="block font-medium uppercase text-muted mb-3"
                style={{ fontSize: '.5rem', letterSpacing: '.3em' }}
              >
                Adresse email
              </label>

              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-transparent text-ink font-light outline-none"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 200,
                  fontSize: '1rem',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '.75rem',
                  marginBottom: '2rem',
                  transition: 'border-color .2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                placeholder="casting@flawamodels.ca"
              />

              {error && (
                <p className="text-red font-medium mb-4" style={{ fontSize: '.75rem', letterSpacing: '.02em' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-medium uppercase text-paper transition-opacity duration-200"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '.58rem',
                  letterSpacing: '.3em',
                  background: 'var(--red)',
                  padding: '1rem',
                  opacity: loading ? .6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Envoi en cours…' : 'Recevoir le code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp}>
              <p
                className="text-muted font-light mb-6"
                style={{ fontSize: '.8rem', lineHeight: 1.7 }}
              >
                Code envoyé à <strong className="text-ink" style={{ fontWeight: 500 }}>{email}</strong>
              </p>

              <label
                className="block font-medium uppercase text-muted mb-3"
                style={{ fontSize: '.5rem', letterSpacing: '.3em' }}
              >
                Code de vérification
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                autoFocus
                className="w-full bg-transparent text-ink outline-none text-center tabular-nums"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: '2rem',
                  letterSpacing: '.35em',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '.75rem',
                  marginBottom: '2rem',
                  transition: 'border-color .2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                placeholder="000000"
              />

              {error && (
                <p className="text-red font-medium mb-4" style={{ fontSize: '.75rem', letterSpacing: '.02em' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-medium uppercase text-paper transition-opacity duration-200"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '.58rem',
                  letterSpacing: '.3em',
                  background: 'var(--red)',
                  padding: '1rem',
                  opacity: loading ? .6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Vérification…' : 'Accéder au dashboard'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="w-full mt-3 font-medium uppercase text-muted transition-colors duration-200 hover:text-ink"
                style={{ fontSize: '.5rem', letterSpacing: '.25em', background: 'none', padding: '.75rem' }}
              >
                Changer d&rsquo;email
              </button>
            </form>
          )}
        </div>

      </div>
    </main>
  )
}
