'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Search,
  Bell,
  Crown,
  Menu,
  Mic,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function Header() {
  const { data: session } = useSession();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="hidden sm:inline-block font-bold text-xl">
            AudioNest
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="오디오북, 팟캐스트 검색..."
              className="pl-9 pr-10"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              {/* VIP Badge */}
              <Link href="/subscription">
                <Badge variant="vip" className="hidden sm:flex gap-1 cursor-pointer">
                  <Crown className="h-3 w-3" />
                  VIP
                </Badge>
              </Link>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User Menu */}
              <Link href="/profile">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="hidden sm:flex">
                  시작하기
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="md:hidden border-t p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="오디오북, 팟캐스트 검색..."
              className="pl-9 pr-10"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
