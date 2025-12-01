import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ContinueListening } from '../../src/components/home/ContinueListening';
import { TrendingSection } from '../../src/components/home/TrendingSection';
import { LiveSection } from '../../src/components/home/LiveSection';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-lg bg-brand-purple items-center justify-center mr-2">
            <Text className="text-white font-bold text-lg">A</Text>
          </View>
          <Text className="text-xl font-bold dark:text-white">AudioNest</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/search')}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="search" size={24} color="#6B7280" />
          </Pressable>
          <Pressable className="w-10 h-10 items-center justify-center relative">
            <Ionicons name="notifications-outline" size={24} color="#6B7280" />
            <View className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
              <Text className="text-white text-[10px] font-bold">3</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ContinueListening />
        <TrendingSection />
        <LiveSection />
      </ScrollView>
    </SafeAreaView>
  );
}
