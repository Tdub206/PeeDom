import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <View className="rounded-[32px] bg-ink-900 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Privacy Policy</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">How StallPass handles your data.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              This policy describes the data processed by the StallPass mobile app and its connected Supabase backend.
            </Text>
            <Text className="mt-3 text-sm font-medium text-white/70">Last updated: April 5, 2026</Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Data We Process</Text>
            <Text className="mt-4 text-base leading-7 text-ink-700">
              Account data: email address, display name, role, points balance, premium state, and authenticated session data.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Community activity: favorites, bathroom reports, bathroom submissions, moderation-related metadata, and optional bathroom photos you choose to upload.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Location data: your current latitude and longitude only when you grant location permission so the app can center nearby bathrooms.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Diagnostics: if Sentry is configured for a production build, crash and error telemetry may be sent to help diagnose failures.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Current launch posture: the April 5, 2026 production build keeps paid premium purchases, rewarded ads, and the separate analytics ingestion endpoint disabled.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Local device storage: cached bathrooms, favorites, drafts, and offline queue items are stored on-device to improve reliability and offline recovery.
            </Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">How We Use It</Text>
            <Text className="mt-4 text-base leading-7 text-ink-700">
              We use account data to authenticate you, keep your favorites and reports synced, and enforce row-level security in Supabase.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              We use location data to show nearby bathrooms and improve map relevance when you actively use the map and search features.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              We use community submissions and reports to keep bathroom listings accurate, trustworthy, and safe for other users.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              We use local storage so your drafts, caches, and queued actions survive app restarts and temporary network loss.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              If a future release enables ads, a paid premium tier, or a separate analytics endpoint, StallPass will update this policy and the store privacy disclosures before rollout.
            </Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Retention And Deletion</Text>
            <Text className="mt-4 text-base leading-7 text-ink-700">
              Your account profile, favorites, reports, ratings, claims, uploaded bathroom photo metadata, and active auth session stay associated with your account until you delete the account.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              If you delete your account, StallPass removes the account and cascades deletion across user-owned records. Bathrooms you personally submitted can remain on the community map, but their authorship is cleared so they are no longer tied to your identity.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              Local caches and drafts remain on the device until they expire, are overwritten, or are cleared when you sign out or remove the app.
            </Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Your Controls</Text>
            <Text className="mt-4 text-base leading-7 text-ink-700">
              You can deny or revoke location permission at the operating-system level at any time.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              You can sign out from the Profile screen whenever you want to stop syncing account data on the device.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              You can export your data from the Profile screen and contact support@stallpass.org for privacy-related support requests.
            </Text>
            <Text className="mt-3 text-base leading-7 text-ink-700">
              You can delete your account from the in-app Account Deletion screen, which is also designed to be published on the web for external account deletion access.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
