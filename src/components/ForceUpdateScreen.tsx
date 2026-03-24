import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

interface ForceUpdateScreenProps {
  message: string | null;
  storeUrl: string | null;
  onTryOta: () => Promise<void>;
  isApplyingOta: boolean;
}

export function ForceUpdateScreen({
  message,
  storeUrl,
  onTryOta,
  isApplyingOta,
}: ForceUpdateScreenProps) {
  const handleOpenStore = () => {
    if (storeUrl) {
      void Linking.openURL(storeUrl);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-download-outline" size={64} color="#2563eb" />
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          {message ?? 'This version of StallPass is no longer supported. Please update to continue.'}
        </Text>

        {isApplyingOta ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Downloading update…</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={onTryOta}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Check for Update</Text>
            </Pressable>

            {storeUrl ? (
              <Pressable style={styles.secondaryButton} onPress={handleOpenStore}>
                <Ionicons name="storefront-outline" size={20} color="#2563eb" />
                <Text style={styles.secondaryButtonText}>Open Store</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
});
