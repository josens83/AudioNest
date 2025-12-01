'use client';

import Image from 'next/image';
import { Play, Pause, SkipForward, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePlayerStore } from '@/store/player-store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playNext,
    openFullPlayer,
    toggleQueue,
    setCurrentTrack,
  } = usePlayerStore();

  // Initialize audio player hook
  useAudioPlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg">
      {/* Progress Bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      <div className="container flex items-center gap-3 h-16 px-4">
        {/* Cover & Info */}
        <button
          onClick={openFullPlayer}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
            <Image
              src={currentTrack.coverUrl}
              alt={currentTrack.albumTitle}
              fill
              className={cn(
                'object-cover transition-transform duration-300',
                isPlaying && 'animate-spin-slow'
              )}
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.albumTitle}
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-10 w-10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            className="h-10 w-10 hidden sm:flex"
          >
            <SkipForward className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleQueue}
            className="h-10 w-10 hidden sm:flex"
          >
            <List className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentTrack(null)}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
