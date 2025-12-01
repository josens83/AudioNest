import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold dark:text-white">서재</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <Text className="text-gray-500 dark:text-gray-400">
          구독 중인 콘텐츠, 좋아요, 다운로드를 관리하세요
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
