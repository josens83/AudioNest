'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';

// Mock data
const listeningHistory = [
  {
    id: '1',
    albumId: 'album1',
    title: '34화. 패스트레인의 비밀',
    albumTitle: '부의 추월차선',
    coverUrl: 'https://picsum.photos/seed/cont1/200/200',
    progress: 67,
    remainingTime: '52:30',
    duration: '2:34:00',
  },
  {
    id: '2',
    albumId: 'album2',
    title: '12화. 역행의 시작',
    albumTitle: '역행자',
    coverUrl: 'https://picsum.photos/seed/cont2/200/200',
    progress: 45,
    remainingTime: '38:20',
    duration: '1:12:00',
  },
  {
    id: '3',
    albumId: 'album3',
    title: '오늘의 뉴스 브리핑',
    albumTitle: '손석희의 앵커브리핑',
    coverUrl: 'https://picsum.photos/seed/cont3/200/200',
    progress: 23,
    remainingTime: '15:45',
    duration: '20:00',
  },
];

export function ContinueListening() {
  if (listeningHistory.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎧 이어서 듣기
        </h2>
        <Link href="/library/history">
          <Button variant="ghost" size="sm">
            더보기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listeningHistory.map((item) => (
          <Card
            key={item.id}
            className="flex overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            {/* Cover */}
            <div className="relative w-24 h-24 shrink-0">
              <Image
                src={item.coverUrl}
                alt={item.albumTitle}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {item.albumTitle}
                </p>
              </div>

              <div className="space-y-1">
                <Progress value={item.progress} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  {item.remainingTime} 남음
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
