'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Mock data
const trendingAlbums = [
  {
    id: '1',
    title: '역행자',
    creator: '자청',
    coverUrl: 'https://picsum.photos/seed/trend1/300/300',
    rating: 4.9,
    playCount: '98만',
    accessType: 'FREEMIUM',
    category: '자기계발',
  },
  {
    id: '2',
    title: '손석희의 앵커브리핑',
    creator: '손석희',
    coverUrl: 'https://picsum.photos/seed/trend2/300/300',
    rating: 4.8,
    playCount: '250만',
    accessType: 'FREE',
    category: '뉴스',
  },
  {
    id: '3',
    title: '원씽',
    creator: '게리 켈러',
    coverUrl: 'https://picsum.photos/seed/trend3/300/300',
    rating: 4.7,
    playCount: '45만',
    accessType: 'VIP',
    category: '자기계발',
  },
  {
    id: '4',
    title: '숙면 ASMR',
    creator: 'AudioNest',
    coverUrl: 'https://picsum.photos/seed/trend4/300/300',
    rating: 4.9,
    playCount: '180만',
    accessType: 'VIP',
    category: 'ASMR',
  },
  {
    id: '5',
    title: '영어회화 30일 완성',
    creator: '어학전문가',
    coverUrl: 'https://picsum.photos/seed/trend5/300/300',
    rating: 4.7,
    playCount: '32만',
    accessType: 'PAID',
    category: '어학',
  },
  {
    id: '6',
    title: '부의 추월차선',
    creator: 'MJ 드마코',
    coverUrl: 'https://picsum.photos/seed/trend6/300/300',
    rating: 4.9,
    playCount: '125만',
    accessType: 'FREEMIUM',
    category: '경영/경제',
  },
];

function getAccessBadge(accessType: string) {
  switch (accessType) {
    case 'FREE':
      return <Badge variant="free">무료</Badge>;
    case 'VIP':
      return <Badge variant="vip">VIP</Badge>;
    case 'PAID':
      return <Badge variant="secondary">유료</Badge>;
    default:
      return null;
  }
}

export function TrendingSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🔥 지금 인기있는
        </h2>
        <Link href="/charts">
          <Button variant="ghost" size="sm">
            더보기
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {trendingAlbums.map((album, index) => (
          <Link key={album.id} href={`/album/${album.id}`}>
            <Card className="group overflow-hidden hover:bg-muted/50 transition-colors">
              {/* Cover */}
              <div className="relative aspect-square">
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  fill
                  className="object-cover"
                />

                {/* Rank */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Access Badge */}
                <div className="absolute top-2 right-2">
                  {getAccessBadge(album.accessType)}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{album.title}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {album.creator}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>⭐ {album.rating}</span>
                  <span>🎧 {album.playCount}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
