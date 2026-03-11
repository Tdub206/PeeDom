import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { routes } from '@/constants/routes';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <View className="flex-1 justify-center px-6 py-10">
        <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
          <Text className="text-4xl font-black tracking-tight text-ink-900">Wrong Turn</Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            That route does not exist in Pee-Dom. Return to the tab shell and continue from there.
          </Text>
          <Button
            className="mt-6"
            label="Back To Map"
            onPress={() => router.replace(routes.tabs.map)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
