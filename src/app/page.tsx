/* Server Component — ne charge aucun JS côté client.
   Chaque section importée est un Client Component, mais Next.js
   ne charge leur bundle JS que pour les composants visibles (code splitting auto). */
import HeroSplit       from '@/components/hero/HeroSplit'
import StatsBar        from '@/components/sections/StatsBar'
import ProcessSection  from '@/components/sections/ProcessSection'
import PhotoStrip      from '@/components/sections/PhotoStrip'
import DarkSection     from '@/components/sections/DarkSection'
import SiteFooter      from '@/components/sections/SiteFooter'

export default function Home() {
  return (
    <main>
      <HeroSplit />
      <StatsBar />
      <ProcessSection />
      <PhotoStrip />
      <DarkSection />
      <SiteFooter />
    </main>
  )
}
