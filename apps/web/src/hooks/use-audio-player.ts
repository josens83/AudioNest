'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { usePlayerStore } from '@/store/player-store';

export function useAudioPlayer() {
  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    playbackRate,
    isMuted,
    sleepTimerEndAt,
    setCurrentTime,
    setDuration,
    setBufferedTime,
    pause,
    playNext,
  } = usePlayerStore();

  // Create/update Howl instance when track changes
  useEffect(() => {
    if (!currentTrack) {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
      return;
    }

    // Unload previous
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Create new Howl
    howlRef.current = new Howl({
      src: [currentTrack.audioUrl],
      html5: true,
      volume: isMuted ? 0 : volume,
      rate: playbackRate,
      onload: () => {
        if (howlRef.current) {
          setDuration(howlRef.current.duration());
        }
      },
      onplay: () => {
        // Start progress tracking
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          if (howlRef.current) {
            const seek = howlRef.current.seek();
            if (typeof seek === 'number') {
              setCurrentTime(seek);
            }
          }
        }, 250);
      },
      onpause: () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      },
      onend: () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        playNext();
      },
      onloaderror: (id, error) => {
        console.error('Audio load error:', error);
      },
      onplayerror: (id, error) => {
        console.error('Audio play error:', error);
      },
    });

    // Auto-play if isPlaying was true
    if (isPlaying && howlRef.current) {
      howlRef.current.play();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentTrack?.episodeId]);

  // Handle play/pause
  useEffect(() => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Handle playback rate
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.rate(playbackRate);
    }
  }, [playbackRate]);

  // Handle sleep timer
  useEffect(() => {
    if (!sleepTimerEndAt) return;

    const checkTimer = setInterval(() => {
      if (new Date() >= sleepTimerEndAt) {
        pause();
        usePlayerStore.getState().clearSleepTimer();
      }
    }, 1000);

    return () => clearInterval(checkTimer);
  }, [sleepTimerEndAt, pause]);

  // Seek function
  const seek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setCurrentTime(time);
    }
  }, [setCurrentTime]);

  // Skip forward/backward
  const skipForward = useCallback((seconds: number = 15) => {
    if (howlRef.current) {
      const current = howlRef.current.seek() as number;
      const duration = howlRef.current.duration();
      const newTime = Math.min(current + seconds, duration);
      howlRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  }, [setCurrentTime]);

  const skipBackward = useCallback((seconds: number = 15) => {
    if (howlRef.current) {
      const current = howlRef.current.seek() as number;
      const newTime = Math.max(current - seconds, 0);
      howlRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  }, [setCurrentTime]);

  return {
    seek,
    skipForward,
    skipBackward,
  };
}
