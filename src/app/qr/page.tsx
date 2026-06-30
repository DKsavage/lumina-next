'use client'

import { QRCodeSVG } from 'qrcode.react'

const URL = 'https://flawamodels.ca'

export default function QRPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 print:p-4"
      style={{ background: '#F7F3EE' }}
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <p
          className="uppercase tracking-[0.3em] text-xs"
          style={{ color: '#8B0020', fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}
        >
          Flawa Models
        </p>
        <h1
          className="text-3xl italic"
          style={{ color: '#1a1a1a', fontFamily: 'var(--font-cormorant)', fontWeight: 300 }}
        >
          Rejoignez l'agence
        </h1>
      </div>

      {/* QR code */}
      <div
        className="bg-white rounded-2xl p-6 shadow-sm"
        style={{ border: '1px solid rgba(139,0,32,0.12)' }}
      >
        <QRCodeSVG
          value={URL}
          size={240}
          fgColor="#1a1a1a"
          bgColor="#ffffff"
          level="M"
        />
      </div>

      {/* URL */}
      <p
        className="text-sm tracking-wide"
        style={{ color: '#8B0020', fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}
      >
        {URL}
      </p>

      {/* Instruction */}
      <p
        className="text-xs text-center max-w-xs leading-relaxed print:hidden"
        style={{ color: '#666', fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}
      >
        Scannez pour accéder au formulaire d'inscription
      </p>

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="print:hidden px-6 py-2 text-xs uppercase tracking-[0.2em] rounded-full transition-colors"
        style={{
          background: '#8B0020',
          color: '#F7F3EE',
          fontFamily: 'var(--font-montserrat)',
          fontWeight: 300,
        }}
      >
        Imprimer
      </button>
    </main>
  )
}
