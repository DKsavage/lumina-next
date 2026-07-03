'use client'

// Error Boundary React — doit être une class component (pas de hook équivalent à getDerivedStateFromError).
// Wraps les composants admin lourds pour éviter un écran blanc en cas d'exception JS.
import { Component, type ReactNode } from 'react'

interface State { hasError: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', fontFamily: "'Montserrat', sans-serif", fontSize: '.7rem', letterSpacing: '.1em', color: '#8B0020' }}>
          Une erreur est survenue.{' '}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{ color: '#8B0020', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
