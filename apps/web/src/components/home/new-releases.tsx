'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';

// Mock data
const newReleases = [
  {
    id: '1',
    title: '돈의 심리학',
    creator: '모건 하우절',
    coverUrl: 'https://picsum.photos/seed/new1/300/300',
    category: '경영/경제',
    totalEpisodes: 28,
    totalDuration: '8시간 45분',
    releaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    accessType: 'VIP',
  },
  {
    id: '2',
    title: '습관의 디테일',
    creator: '제임스 클리어',
    coverUrl: 'https://picsum.photos/seed/new2/300/300',
    category: '자기계발',
    totalEpisodes: 24,
    totalDuration: '7시간 20분',
    releaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    accessType: 'FREEMIUM',
  },
  {
    id: '3',
    title: '마인드셋',
    creator: '캐롤 드웩',
    coverUrl: 'https://picsum.photos/seed/new3/300/300',
    category: '자기계발',
    totalEpisodes: 32,
    totalDuration: '10시간 15분',
    releaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    accessType: 'VIP',
  },
  {
    id: '4',
    title: '언어의 온도',
    creator: '이기주',
    coverUrl: 'https://picsum.photos/seed/new4/300/300',
    category: '에세이',
    totalEpisodes: 18,
    totalDuration: '5시간 30분',
    releaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    accessType: 'FREEMIUM',
  },
];

export function NewReleases() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          ✨ 신작 오디오북
        </h2>
        <Link href="/new">
          <Button variant="ghost" size="sm">
            더보기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {newReleases.map((album) => (
          <Link key={album.id} href={`/album/${album.id}`}>
            <Card className="overflow-hidden hover:bg-muted/50 transition-colors group">
              {/* Cover */}
              <div className="relative aspect-square">
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  fill
                  className="object-cover"
                />

                {/* NEW Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-green-500 text-white">NEW</Badge>
                </div>

                {/* Access Badge */}
                {album.accessType === 'VIP' && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="vip">VIP</Badge>
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <Play className="h-6 w-6 text-black fill-black ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div>
                  <h3 className="font-semibold truncate">{album.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {album.creator}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{album.category}</Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {album.totalDuration}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(album.releaseDate)} 출시 · {album.totalEpisodes}화
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
