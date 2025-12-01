'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlayerStore } from '@/store/player-store';
import { cn } from '@/lib/utils';

const PRESET_TIMES = [
  { label: '15분', value: 15 },
  { label: '30분', value: 30 },
  { label: '45분', value: 45 },
  { label: '60분', value: 60 },
  { label: '90분', value: 90 },
  { label: '2시간', value: 120 },
];

interface SleepTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SleepTimerModal({ open, onOpenChange }: SleepTimerModalProps) {
  const { sleepTimerEndAt, sleepTimerType, setSleepTimer, clearSleepTimer } =
    usePlayerStore();

  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [fadeOutEnabled, setFadeOutEnabled] = useState(true);

  const handleSetTimer = (minutes: number | null) => {
    if (minutes === null) {
      // End of episode
      setSleepTimer(-1, 'episodes');
    } else {
      setSleepTimer(minutes, 'time');
    }
    onOpenChange(false);
  };

  const handleSetCustomTimer = () => {
    const totalMinutes = customHours * 60 + customMinutes;
    if (totalMinutes > 0) {
      setSleepTimer(totalMinutes, 'time');
      onOpenChange(false);
    }
  };

  const getRemainingTime = () => {
    if (!sleepTimerEndAt) return null;
    const remaining = Math.max(
      0,
      Math.ceil((new Date(sleepTimerEndAt).getTime() - Date.now()) / 60000)
    );
    if (remaining >= 60) {
      return `${Math.floor(remaining / 60)}시간 ${remaining % 60}분`;
    }
    return `${remaining}분`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💤 슬립 타이머
          </DialogTitle>
        </DialogHeader>

        {/* Active Timer Display */}
        {sleepTimerEndAt && (
          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">타이머 활성화됨</p>
                <p className="font-medium">{getRemainingTime()} 후 종료</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearSleepTimer}>
                취소
              </Button>
            </div>
          </div>
        )}

        {/* Preset Times */}
        <div className="grid grid-cols-3 gap-2">
          {PRESET_TIMES.map(({ label, value }) => (
            <Button
              key={value}
              variant="outline"
              onClick={() => handleSetTimer(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* End of Episode */}
        <Button
          variant="outline"
          onClick={() => handleSetTimer(null)}
          className="w-full"
        >
          🎧 에피소드 끝나면
        </Button>

        {/* Custom Time */}
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">사용자 지정</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={23}
              value={customHours}
              onChange={(e) => setCustomHours(Number(e.target.value))}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">시간</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">분</span>
          </div>
          <Button
            onClick={handleSetCustomTimer}
            disabled={customHours === 0 && customMinutes === 0}
            className="w-full"
          >
            설정
          </Button>
        </div>

        {/* Fade Out Option */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={fadeOutEnabled}
            onChange={(e) => setFadeOutEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">타이머 종료 시 볼륨 서서히 줄이기</span>
        </label>
      </DialogContent>
    </Dialog>
  );
}
