import { View, Text, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const mockData = [
  {
    id: '1',
    title: '34화. 패스트레인의 비밀',
    albumTitle: '부의 추월차선',
    coverUrl: 'https://picsum.photos/seed/cont1/200/200',
    progress: 67,
    remainingTime: '52:30',
  },
  {
    id: '2',
    title: '12화. 역행의 시작',
    albumTitle: '역행자',
    coverUrl: 'https://picsum.photos/seed/cont2/200/200',
    progress: 45,
    remainingTime: '38:20',
  },
];

export function ContinueListening() {
  if (mockData.length === 0) return null;

  return (
    <View className="py-4">
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-bold dark:text-white">
          🎧 이어서 듣기
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
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push('/player')}
            className="mr-3 w-64 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden"
          >
            <View className="flex-row p-3">
              <Image
                source={{ uri: item.coverUrl }}
                className="w-16 h-16 rounded-lg"
              />
              <View className="flex-1 ml-3 justify-center">
                <Text
                  className="font-medium dark:text-white"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {item.albumTitle}
                </Text>
              </View>
            </View>

            {/* Progress */}
            <View className="px-3 pb-3">
              <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-brand-purple rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                {item.remainingTime} 남음
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
