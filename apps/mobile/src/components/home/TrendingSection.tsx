import { View, Text, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

const mockData = [
  {
    id: '1',
    title: '역행자',
    creator: '자청',
    coverUrl: 'https://picsum.photos/seed/trend1/300/300',
    rating: 4.9,
    playCount: '98만',
  },
  {
    id: '2',
    title: '손석희의 앵커브리핑',
    creator: '손석희',
    coverUrl: 'https://picsum.photos/seed/trend2/300/300',
    rating: 4.8,
    playCount: '250만',
  },
  {
    id: '3',
    title: '원씽',
    creator: '게리 켈러',
    coverUrl: 'https://picsum.photos/seed/trend3/300/300',
    rating: 4.7,
    playCount: '45만',
  },
  {
    id: '4',
    title: '숙면 ASMR',
    creator: 'AudioNest',
    coverUrl: 'https://picsum.photos/seed/trend4/300/300',
    rating: 4.9,
    playCount: '180만',
  },
];

export function TrendingSection() {
  return (
    <View className="py-4">
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-bold dark:text-white">
          🔥 지금 인기있는
        </Text>
        <Pressable>
          <Text className="text-brand-purple">더보기</Text>
        </Pressable>
      </View>

      <FlatList
        data={mockData}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/album/${item.id}`)}
            className="mr-3 w-32"
          >
            <View className="relative">
              <Image
                source={{ uri: item.coverUrl }}
                className="w-32 h-32 rounded-lg"
              />
              <View className="absolute top-2 left-2 w-6 h-6 bg-black/70 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {index + 1}
                </Text>
              </View>
            </View>
            <Text className="font-medium mt-2 dark:text-white" numberOfLines={1}>
              {item.title}
            </Text>
            <Text className="text-sm text-gray-500" numberOfLines={1}>
              {item.creator}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-500">
                ⭐ {item.rating} · 🎧 {item.playCount}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
