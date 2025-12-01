import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueueItem {
  episodeId: string;
  albumId: string;
  title: string;
  albumTitle: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  creatorName: string;
}

export interface PlayerState {
  // Current Playback
  currentTrack: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;

  // Settings
  volume: number;
  playbackRate: number;
  isMuted: boolean;

  // Queue
  queue: QueueItem[];
  queueIndex: number;

  // Modes
  repeatMode: 'none' | 'one' | 'all';
  shuffleEnabled: boolean;

  // Sleep Timer
  sleepTimerEndAt: Date | null;
  sleepTimerType: 'time' | 'episodes' | null;
  sleepEpisodesRemaining: number | null;

  // UI State
  isFullPlayerOpen: boolean;
  isQueueOpen: boolean;

  // Actions
  setCurrentTrack: (track: QueueItem | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBufferedTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMute: () => void;

  // Queue Actions
  addToQueue: (items: QueueItem | QueueItem[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // Mode Actions
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;

  // Sleep Timer Actions
  setSleepTimer: (minutes: number | null, type?: 'time' | 'episodes') => void;
  clearSleepTimer: () => void;
  decrementSleepEpisodes: () => void;

  // UI Actions
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  toggleQueue: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      bufferedTime: 0,
      volume: 1,
      playbackRate: 1,
      isMuted: false,
      queue: [],
      queueIndex: -1,
      repeatMode: 'none',
      shuffleEnabled: false,
      sleepTimerEndAt: null,
      sleepTimerType: null,
      sleepEpisodesRemaining: null,
      isFullPlayerOpen: false,
      isQueueOpen: false,

      // Playback Actions
      setCurrentTrack: (track) => set({ currentTrack: track, currentTime: 0 }),
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setBufferedTime: (time) => set({ bufferedTime: time }),
      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      // Queue Actions
      addToQueue: (items) =>
        set((state) => ({
          queue: [...state.queue, ...(Array.isArray(items) ? items : [items])],
        })),

      removeFromQueue: (index) =>
        set((state) => {
          const newQueue = [...state.queue];
          newQueue.splice(index, 1);
          let newQueueIndex = state.queueIndex;
          if (index < state.queueIndex) {
            newQueueIndex--;
          } else if (index === state.queueIndex) {
            newQueueIndex = Math.min(newQueueIndex, newQueue.length - 1);
          }
          return { queue: newQueue, queueIndex: newQueueIndex };
        }),

      clearQueue: () => set({ queue: [], queueIndex: -1 }),

      playFromQueue: (index) =>
        set((state) => {
          if (index >= 0 && index < state.queue.length) {
            return {
              currentTrack: state.queue[index],
              queueIndex: index,
              currentTime: 0,
              isPlaying: true,
            };
          }
          return state;
        }),

      playNext: () => {
        const { queue, queueIndex, repeatMode, shuffleEnabled, sleepTimerType } = get();

        if (queue.length === 0) return;

        let nextIndex: number;

        if (repeatMode === 'one') {
          set({ currentTime: 0, isPlaying: true });
          return;
        }

        if (shuffleEnabled) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else {
          nextIndex = queueIndex + 1;
          if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
              nextIndex = 0;
            } else {
              set({ isPlaying: false });
              return;
            }
          }
        }

        // Check sleep timer episodes
        if (sleepTimerType === 'episodes') {
          const remaining = get().sleepEpisodesRemaining;
          if (remaining !== null && remaining <= 1) {
            set({ isPlaying: false, sleepTimerEndAt: null, sleepTimerType: null, sleepEpisodesRemaining: null });
            return;
          }
          get().decrementSleepEpisodes();
        }

        set({
          currentTrack: queue[nextIndex],
          queueIndex: nextIndex,
          currentTime: 0,
          isPlaying: true,
        });
      },

      playPrevious: () => {
        const { queue, queueIndex, currentTime } = get();

        if (currentTime > 5) {
          set({ currentTime: 0 });
          return;
        }

        if (queue.length === 0) return;

        let prevIndex = queueIndex - 1;
        if (prevIndex < 0) {
          prevIndex = queue.length - 1;
        }

        set({
          currentTrack: queue[prevIndex],
          queueIndex: prevIndex,
          currentTime: 0,
          isPlaying: true,
        });
      },

      reorderQueue: (fromIndex, toIndex) =>
        set((state) => {
          const newQueue = [...state.queue];
          const [item] = newQueue.splice(fromIndex, 1);
          newQueue.splice(toIndex, 0, item);

          let newQueueIndex = state.queueIndex;
          if (fromIndex === state.queueIndex) {
            newQueueIndex = toIndex;
          } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
            newQueueIndex--;
          } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
            newQueueIndex++;
          }

          return { queue: newQueue, queueIndex: newQueueIndex };
        }),

      // Mode Actions
      toggleRepeatMode: () =>
        set((state) => {
          const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
          const currentIndex = modes.indexOf(state.repeatMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { repeatMode: modes[nextIndex] };
        }),

      toggleShuffle: () =>
        set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),

      // Sleep Timer Actions
      setSleepTimer: (minutes, type = 'time') => {
        if (minutes === null || minutes === -1) {
          set({
            sleepTimerEndAt: null,
            sleepTimerType: 'episodes',
            sleepEpisodesRemaining: 1,
          });
        } else {
          set({
            sleepTimerEndAt: new Date(Date.now() + minutes * 60 * 1000),
            sleepTimerType: type,
            sleepEpisodesRemaining: null,
          });
        }
      },

      clearSleepTimer: () =>
        set({
          sleepTimerEndAt: null,
          sleepTimerType: null,
          sleepEpisodesRemaining: null,
        }),

      decrementSleepEpisodes: () =>
        set((state) => ({
          sleepEpisodesRemaining:
            state.sleepEpisodesRemaining !== null
              ? state.sleepEpisodesRemaining - 1
              : null,
        })),

      // UI Actions
      openFullPlayer: () => set({ isFullPlayerOpen: true }),
      closeFullPlayer: () => set({ isFullPlayerOpen: false }),
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
    }),
    {
      name: 'audionest-player',
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
        shuffleEnabled: state.shuffleEnabled,
      }),
    }
  )
);
