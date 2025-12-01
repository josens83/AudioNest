'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock data
const featuredCreators = [
  {
    id: '1',
    name: '음성작가 민서',
    avatarUrl: 'https://picsum.photos/seed/creator1/200/200',
    bio: '오디오북 전문 성우',
    followerCount: 15234,
    albumCount: 42,
    isVerified: true,
  },
  {
    id: '2',
    name: 'ASMR 소이',
    avatarUrl: 'https://picsum.photos/seed/creator2/200/200',
    bio: 'ASMR & 수면 콘텐츠',
    followerCount: 28456,
    albumCount: 85,
    isVerified: true,
  },
  {
    id: '3',
    name: 'English Pro',
    avatarUrl: 'https://picsum.photos/seed/creator3/200/200',
    bio: '영어 회화 전문',
    followerCount: 8923,
    albumCount: 23,
    isVerified: true,
  },
  {
    id: '4',
    name: '지식채널',
    avatarUrl: 'https://picsum.photos/seed/creator4/200/200',
    bio: '지식 콘텐츠 제작',
    followerCount: 12567,
    albumCount: 56,
    isVerified: false,
  },
  {
    id: '5',
    name: '북캐스터 준',
    avatarUrl: 'https://picsum.photos/seed/creator5/200/200',
    bio: '책 리뷰 팟캐스트',
    followerCount: 6789,
    albumCount: 34,
    isVerified: true,
  },
];

function formatFollowerCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}천`;
  }
  return count.toString();
}

export function FeaturedCreators() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎙️ 인기 크리에이터
        </h2>
        <Link href="/creators">
          <Button variant="ghost" size="sm">
            더보기
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {featuredCreators.map((creator) => (
          <Link key={creator.id} href={`/creator/${creator.id}`}>
            <Card className="p-4 flex flex-col items-center text-center hover:bg-muted/50 transition-colors">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={creator.avatarUrl} />
                  <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {creator.isVerified && (
                  <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 text-primary fill-background" />
                )}
              </div>

              {/* Info */}
              <div className="mt-3 space-y-1">
                <h3 className="font-medium text-sm">{creator.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {creator.bio}
                </p>
                <p className="text-xs text-muted-foreground">
                  팔로워 {formatFollowerCount(creator.followerCount)} · 앨범 {creator.albumCount}개
                </p>
              </div>

              {/* Follow Button */}
              <Button size="sm" variant="outline" className="mt-3 w-full">
                팔로우
              </Button>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
