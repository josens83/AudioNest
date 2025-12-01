'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock data
const liveRooms = [
  {
    id: '1',
    title: '책읽어주는 밤 - 어린왕자',
    hostName: '음성작가 민서',
    hostAvatar: 'https://picsum.photos/seed/host1/100/100',
    coverUrl: 'https://picsum.photos/seed/live1/400/200',
    listeners: 1234,
    tags: ['오디오북', '소설'],
  },
  {
    id: '2',
    title: '수면 ASMR 라이브',
    hostName: 'ASMR 소이',
    hostAvatar: 'https://picsum.photos/seed/host2/100/100',
    coverUrl: 'https://picsum.photos/seed/live2/400/200',
    listeners: 856,
    tags: ['ASMR', '수면'],
  },
  {
    id: '3',
    title: '영어 회화 Q&A',
    hostName: 'English Pro',
    hostAvatar: 'https://picsum.photos/seed/host3/100/100',
    coverUrl: 'https://picsum.photos/seed/live3/400/200',
    listeners: 423,
    tags: ['어학', '영어'],
  },
];

export function LiveSection() {
  if (liveRooms.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          📻 실시간 LIVE
          <Badge variant="live" className="ml-2">
            LIVE
          </Badge>
        </h2>
        <Link href="/live">
          <Button variant="ghost" size="sm">
            더보기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {liveRooms.map((room) => (
          <Link key={room.id} href={`/live/${room.id}`}>
            <Card className="overflow-hidden hover:bg-muted/50 transition-colors group">
              {/* Cover */}
              <div className="relative aspect-video">
                <Image
                  src={room.coverUrl}
                  alt={room.title}
                  fill
                  className="object-cover"
                />

                {/* Live Badge */}
                <div className="absolute top-3 left-3">
                  <Badge variant="live" className="gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </Badge>
                </div>

                {/* Listener Count */}
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.listeners.toLocaleString()}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Title */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-medium truncate">
                    {room.title}
                  </h3>
                </div>
              </div>

              {/* Host Info */}
              <div className="p-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={room.hostAvatar} />
                  <AvatarFallback>{room.hostName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{room.hostName}</p>
                  <div className="flex gap-1 mt-1">
                    {room.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
