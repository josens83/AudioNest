import { create } from 'zustand';

interface Track {
  episodeId: string;
  albumId: string;
  title: string;
  albumTitle: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  creatorName: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  setCurrentTrack: (track: Track | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: {
    episodeId: '1',
    albumId: '1',
    title: '34화. 패스트레인의 비밀',
    albumTitle: '부의 추월차선',
    coverUrl: 'https://picsum.photos/seed/player/400/400',
    audioUrl: '',
    duration: 3150,
    creatorName: 'MJ 드마코',
  },
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,

  setCurrentTrack: (track) => set({ currentTrack: track }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
}));
