import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat, Geist } from 'next/font/google'
import CustomCursor from '@/components/CustomCursor'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


/* next/font/google charge les fonts côté serveur → zéro flash, zéro FOUT.
   variable: '--font-cormorant' → injecte une variable CSS sur <html>
   que globals.css utilise via var(--font-cormorant).
   display: 'swap' → affiche la font système le temps du chargement,
   puis swipe vers la vraie font sans bloquer le rendu. */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lumina Photography — Casting Montréal',
  description: 'Agence de casting photographique à Montréal. Shootings éditoriaux, commerciaux, campagnes de mode. Tous profils.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* Les deux variables de font sont injectées sur <html> →
       disponibles partout dans l'arbre DOM via CSS. */
    <html
      lang="fr"
      className={cn(cormorant.variable, montserrat.variable, "font-sans", geist.variable)}
    >
      <body>
        {/* Client component isolé — le reste du layout reste Server Component */}
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}
