import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePlayerStore } from '../src/store/playerStore';

export default function PlayerScreen() {
  const { currentTrack, isPlaying, togglePlay, playbackRate, setPlaybackRate } =
    usePlayerStore();

  if (!currentTrack) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color="#6B7280" />
        </Pressable>
        <View className="items-center">
          <Text className="text-xs text-gray-500">현재 재생 중</Text>
          <Text className="font-medium dark:text-white" numberOfLines={1}>
            {currentTrack.albumTitle}
          </Text>
        </View>
        <Pressable>
          <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
        </Pressable>
      </View>

      {/* Cover */}
      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={{ uri: currentTrack.coverUrl }}
          className="w-72 h-72 rounded-xl shadow-2xl"
        />
      </View>

      {/* Info */}
      <View className="px-8 py-4">
        <Text className="text-xl font-bold text-center dark:text-white">
          {currentTrack.title}
        </Text>
        <Text className="text-center text-gray-500 mt-1">
          {currentTrack.creatorName}
        </Text>
      </View>

      {/* Progress */}
      <View className="px-8 py-4">
        <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
          <View
            className="h-full bg-brand-purple rounded-full"
            style={{ width: '45%' }}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-xs text-gray-500">12:34</Text>
          <Text className="text-xs text-gray-500">52:30</Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center gap-6 py-4">
        <Pressable>
          <Ionicons name="shuffle" size={24} color="#6B7280" />
        </Pressable>
        <Pressable>
          <Ionicons name="play-skip-back" size={32} color="#374151" />
        </Pressable>
        <Pressable
          onPress={togglePlay}
          className="w-16 h-16 bg-brand-purple rounded-full items-center justify-center"
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="white"
          />
        </Pressable>
        <Pressable>
          <Ionicons name="play-skip-forward" size={32} color="#374151" />
        </Pressable>
        <Pressable>
          <Ionicons name="repeat" size={24} color="#6B7280" />
        </Pressable>
      </View>

      {/* Bottom Controls */}
      <View className="flex-row items-center justify-around px-8 py-6 border-t border-gray-100 dark:border-gray-800">
        <Pressable className="items-center">
          <Text className="text-brand-purple font-medium">{playbackRate}x</Text>
        </Pressable>
        <Pressable className="items-center">
          <Ionicons name="moon-outline" size={24} color="#6B7280" />
        </Pressable>
        <Pressable className="items-center">
          <Ionicons name="list" size={24} color="#6B7280" />
        </Pressable>
        <Pressable className="items-center">
          <Ionicons name="download-outline" size={24} color="#6B7280" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
