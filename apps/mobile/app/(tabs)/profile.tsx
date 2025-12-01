import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold dark:text-white">나의</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Section */}
        <View className="px-4 py-6 items-center">
          <View className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center overflow-hidden">
            <Ionicons name="person" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-lg font-semibold mt-3 dark:text-white">
            로그인하세요
          </Text>
          <Pressable className="mt-3 bg-brand-purple px-6 py-2 rounded-full">
            <Text className="text-white font-semibold">로그인</Text>
          </Pressable>
        </View>

        {/* VIP Banner */}
        <Pressable className="mx-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
          <View className="flex-row items-center">
            <Ionicons name="crown" size={24} color="white" />
            <View className="ml-3 flex-1">
              <Text className="text-white font-bold">VIP 멤버십</Text>
              <Text className="text-white/80 text-sm">
                광고 없이 무제한 청취
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </Pressable>

        {/* Stats */}
        <View className="flex-row justify-around py-6 border-b border-gray-100 dark:border-gray-800 mx-4">
          <View className="items-center">
            <Text className="text-xl font-bold dark:text-white">0분</Text>
            <Text className="text-gray-500 text-sm">총 청취</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold dark:text-white">0일</Text>
            <Text className="text-gray-500 text-sm">연속 청취</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold dark:text-white">0</Text>
            <Text className="text-gray-500 text-sm">코인</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="px-4 py-4">
          {[
            { icon: 'time-outline', label: '청취 기록' },
            { icon: 'download-outline', label: '다운로드' },
            { icon: 'settings-outline', label: '설정' },
            { icon: 'help-circle-outline', label: '고객센터' },
          ].map((item, index) => (
            <Pressable
              key={index}
              className="flex-row items-center py-4 border-b border-gray-100 dark:border-gray-800"
            >
              <Ionicons name={item.icon as any} size={24} color="#6B7280" />
              <Text className="flex-1 ml-3 text-gray-700 dark:text-gray-300">
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
