/* Server Component — ne charge aucun JS côté client.
   Chaque section importée est un Client Component, mais Next.js
   ne charge leur bundle JS que pour les composants visibles (code splitting auto). */
import HeroSplit from '@/components/hero/HeroSplit'

export default function Home() {
  return (
    <main>
      <HeroSplit />
    </main>
  )
}
