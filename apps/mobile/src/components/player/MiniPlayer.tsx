import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePlayerStore } from '../../store/playerStore';

export function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlay } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <Pressable
      onPress={() => router.push('/player')}
      className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      {/* Progress */}
      <View className="h-1 bg-gray-200 dark:bg-gray-700">
        <View
          className="h-full bg-brand-purple"
          style={{ width: '45%' }}
        />
      </View>

      <View className="flex-row items-center px-4 py-3">
        <Image
          source={{ uri: currentTrack.coverUrl }}
          className="w-10 h-10 rounded"
        />
        <View className="flex-1 mx-3">
          <Text className="font-medium dark:text-white" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {currentTrack.albumTitle}
          </Text>
        </View>
        <Pressable onPress={togglePlay} className="w-10 h-10 items-center justify-center">
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color="#7C3AED"
          />
        </Pressable>
        <Pressable className="w-10 h-10 items-center justify-center">
          <Ionicons name="play-skip-forward" size={24} color="#6B7280" />
        </Pressable>
      </View>
    </Pressable>
  );
}
