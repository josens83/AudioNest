'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  List,
  Volume2,
  VolumeX,
  Moon,
  Download,
  Share2,
  Heart,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/store/player-store';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { formatDuration, cn } from '@/lib/utils';
import { useState } from 'react';

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

export function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    repeatMode,
    shuffleEnabled,
    isFullPlayerOpen,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    setPlaybackRate,
    toggleMute,
    toggleRepeatMode,
    toggleShuffle,
    closeFullPlayer,
    toggleQueue,
  } = usePlayerStore();

  const { seek, skipForward, skipBackward } = useAudioPlayer();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (value: number[]) => {
    const time = (value[0] / 100) * duration;
    seek(time);
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return <Repeat1 className="h-5 w-5" />;
      default:
        return <Repeat className="h-5 w-5" />;
    }
  };

  return (
    <AnimatePresence>
      {isFullPlayerOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="h-full flex flex-col max-w-lg mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={closeFullPlayer}>
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  현재 재생 중
                </p>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {currentTrack.albumTitle}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </div>

            {/* Cover Art */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div
                className={cn(
                  'relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-2xl',
                  isPlaying && 'animate-pulse'
                )}
              >
                <Image
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold truncate">{currentTrack.title}</h2>
              <p className="text-muted-foreground">{currentTrack.creatorName}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn(shuffleEnabled && 'text-primary')}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipBackward(15)}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                onClick={togglePlay}
                className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 fill-white text-white" />
                ) : (
                  <Play className="h-8 w-8 fill-white text-white ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipForward(15)}
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRepeatMode}
                className={cn(repeatMode !== 'none' && 'text-primary')}
              >
                {getRepeatIcon()}
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-between">
              {/* Speed */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="gap-1"
                >
                  <Gauge className="h-4 w-4" />
                  {playbackRate}x
                </Button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-popover border rounded-lg p-2 shadow-lg">
                    <div className="grid grid-cols-3 gap-1">
                      {PLAYBACK_RATES.map((rate) => (
                        <Button
                          key={rate}
                          variant={playbackRate === rate ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSpeedMenu(false);
                          }}
                        >
                          {rate}x
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 w-32">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={(v) => setVolume(v[0] / 100)}
                  max={100}
                  className="w-20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Moon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleQueue}>
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
