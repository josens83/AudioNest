import { View, Text, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const mockData = [
  {
    id: '1',
    title: '책읽어주는 밤 - 어린왕자',
    hostName: '음성작가 민서',
    coverUrl: 'https://picsum.photos/seed/live1/400/200',
    listeners: 1234,
  },
  {
    id: '2',
    title: '수면 ASMR 라이브',
    hostName: 'ASMR 소이',
    coverUrl: 'https://picsum.photos/seed/live2/400/200',
    listeners: 856,
  },
];

export function LiveSection() {
  if (mockData.length === 0) return null;

  return (
    <View className="py-4">
      <View className="flex-row items-center justify-between px-4 mb-3">
        <View className="flex-row items-center">
          <Text className="text-lg font-bold dark:text-white">
            📻 실시간 LIVE
          </Text>
          <View className="ml-2 px-2 py-0.5 bg-red-500 rounded-full">
            <Text className="text-white text-xs font-bold">LIVE</Text>
          </View>
        </View>
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/live/${item.id}`)}
            className="mr-3 w-72 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden"
          >
            <View className="relative">
              <Image
                source={{ uri: item.coverUrl }}
                className="w-72 h-36"
              />
              {/* Live Badge */}
              <View className="absolute top-2 left-2 flex-row items-center px-2 py-1 bg-red-500 rounded-full">
                <View className="w-1.5 h-1.5 bg-white rounded-full mr-1" />
                <Text className="text-white text-xs font-bold">LIVE</Text>
              </View>
              {/* Listeners */}
              <View className="absolute top-2 right-2 flex-row items-center px-2 py-1 bg-black/60 rounded-full">
                <Ionicons name="people" size={12} color="white" />
                <Text className="text-white text-xs ml-1">
                  {item.listeners.toLocaleString()}
                </Text>
              </View>
              {/* Title */}
              <View className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <Text className="text-white font-medium" numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            </View>
            <View className="p-3">
              <Text className="text-gray-600 dark:text-gray-400">
                {item.hostName}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
