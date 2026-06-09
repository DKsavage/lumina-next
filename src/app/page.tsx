/* Server Component — ne charge aucun JS côté client.
   Chaque section importée est un Client Component, mais Next.js
   ne charge leur bundle JS que pour les composants visibles (code splitting auto). */
import HeroSplit   from '@/components/hero/HeroSplit'
import PhotoStrip  from '@/components/sections/PhotoStrip'
import DarkSection from '@/components/sections/DarkSection'
import SiteFooter  from '@/components/sections/SiteFooter'

export default function Home() {
  return (
    <main>
      <HeroSplit />
      <PhotoStrip />
      <DarkSection />
      <SiteFooter />
    </main>
  )
}
