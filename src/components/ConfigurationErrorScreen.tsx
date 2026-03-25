import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConfigurationErrorScreenProps {
  title: string;
  message: string;
}

export function ConfigurationErrorScreen({ title, message }: ConfigurationErrorScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <View className="flex-1 justify-center px-6 py-10">
        <View className="rounded-[28px] border border-danger/20 bg-surface-card p-6">
          <Text className="text-3xl font-black text-ink-900">{title}</Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">{message}</Text>
          <Text className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm leading-5 text-danger">
            This build is blocked until the missing runtime configuration is supplied.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
