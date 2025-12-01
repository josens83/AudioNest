import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MiniPlayer } from '@/components/player/mini-player';
import { HeroSection } from '@/components/home/hero-section';
import { ContinueListening } from '@/components/home/continue-listening';
import { TrendingSection } from '@/components/home/trending-section';
import { LiveSection } from '@/components/home/live-section';
import { CategorySection } from '@/components/home/category-section';
import { NewReleases } from '@/components/home/new-releases';
import { FeaturedCreators } from '@/components/home/featured-creators';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background has-mini-player">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-20 space-y-8">
        <HeroSection />
        <ContinueListening />
        <TrendingSection />
        <LiveSection />
        <CategorySection />
        <NewReleases />
        <FeaturedCreators />
      </main>

      <MiniPlayer />
      <MobileNav />
    </div>
  );
}
