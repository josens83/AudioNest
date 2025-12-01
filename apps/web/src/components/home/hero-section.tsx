'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const featuredContent = {
  id: '1',
  title: '부의 추월차선',
  subtitle: '30대에 은퇴한 저자가 알려주는 패스트레인 전략',
  coverUrl: 'https://picsum.photos/seed/featured1/800/400',
  category: '자기계발',
  rating: 4.9,
  playCount: '12.5만',
  creator: 'MJ 드마코',
  isExclusive: true,
};

export function HeroSection() {
  return (
    <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-purple/20 to-brand-pink/20">
      <div className="absolute inset-0">
        <Image
          src={featuredContent.coverUrl}
          alt={featuredContent.title}
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>

      <div className="relative p-6 md:p-8 lg:p-12 flex flex-col md:flex-row gap-6 items-center">
        {/* Cover Image */}
        <div className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 shrink-0">
          <Image
            src={featuredContent.coverUrl}
            alt={featuredContent.title}
            fill
            className="object-cover rounded-lg shadow-2xl"
          />
          {featuredContent.isExclusive && (
            <Badge variant="svip" className="absolute -top-2 -right-2">
              독점
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{featuredContent.category}</Badge>
            <span>⭐ {featuredContent.rating}</span>
            <span>🎧 {featuredContent.playCount}</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            {featuredContent.title}
          </h1>

          <p className="text-muted-foreground max-w-lg">
            {featuredContent.subtitle}
          </p>

          <p className="text-sm text-muted-foreground">
            {featuredContent.creator}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <Button size="lg" className="gap-2">
              <Play className="h-5 w-5 fill-current" />
              지금 듣기
            </Button>
            <Link href={`/album/${featuredContent.id}`}>
              <Button variant="outline" size="lg" className="gap-2">
                자세히 보기
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
