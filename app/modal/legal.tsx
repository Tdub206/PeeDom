import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type LegalTab = 'privacy' | 'terms';

const PRIVACY_LAST_UPDATED = 'March 23, 2026';
const TERMS_LAST_UPDATED = 'March 23, 2026';

function SectionHeading({ children }: { children: string }) {
  return <Text className="mt-6 text-lg font-bold text-ink-900">{children}</Text>;
}

function Paragraph({ children }: { children: string }) {
  return <Text className="mt-2 text-sm leading-6 text-ink-700">{children}</Text>;
}

function BulletItem({ children }: { children: string }) {
  return (
    <View className="mt-1 flex-row pl-2">
      <Text className="text-sm leading-6 text-ink-500">{'\u2022  '}</Text>
      <Text className="flex-1 text-sm leading-6 text-ink-700">{children}</Text>
    </View>
  );
}

function PrivacyPolicyContent() {
  return (
    <>
      <Text className="text-xs text-ink-500">Last updated: {PRIVACY_LAST_UPDATED}</Text>

      <Paragraph>
        Pee-Dom ("we", "us", "our") operates the Pee-Dom mobile application. This Privacy Policy
        explains how we collect, use, disclose, and safeguard your information when you use our app.
      </Paragraph>

      <SectionHeading>1. Information We Collect</SectionHeading>
      <Paragraph>We collect the following categories of information:</Paragraph>
      <BulletItem>Account information: display name, email address, and hashed password when you register.</BulletItem>
      <BulletItem>Location data: your device's GPS coordinates while the app is in use, to show nearby bathrooms and power emergency mode.</BulletItem>
      <BulletItem>User-generated content: bathroom submissions, access codes, cleanliness ratings, live status updates, accessibility details, reports, and photos you upload.</BulletItem>
      <BulletItem>Device information: push notification tokens, device platform, and app version for delivering notifications and diagnosing crashes.</BulletItem>
      <BulletItem>Analytics events: app launch, authentication, emergency mode activation, and offline sync events to improve reliability.</BulletItem>

      <SectionHeading>2. How We Use Your Information</SectionHeading>
      <BulletItem>Display nearby bathrooms and provide navigation.</BulletItem>
      <BulletItem>Deliver push notifications you have opted into.</BulletItem>
      <BulletItem>Power the gamification system (points, badges, leaderboards).</BulletItem>
      <BulletItem>Moderate content and enforce community guidelines.</BulletItem>
      <BulletItem>Diagnose crashes and improve app performance via Sentry.</BulletItem>
      <BulletItem>Show ads through Google AdMob with your consent where required.</BulletItem>

      <SectionHeading>3. Information Sharing</SectionHeading>
      <Paragraph>
        We do not sell your personal information. We share data only with service providers that help
        us operate the app: Supabase (database and authentication), Sentry (error monitoring),
        Google AdMob (advertising), and Google Maps (map rendering). Each provider processes data
        under their own privacy policies.
      </Paragraph>

      <SectionHeading>4. Ad Consent (GDPR/EEA)</SectionHeading>
      <Paragraph>
        If you are located in the European Economic Area, we request your consent before showing
        personalized ads through Google's User Messaging Platform (UMP). You can change your ad
        preferences at any time in your device settings.
      </Paragraph>

      <SectionHeading>5. Data Retention</SectionHeading>
      <Paragraph>
        We retain your account data for as long as your account is active. Deactivated accounts
        retain anonymized contribution data. When you request full account deletion, we permanently
        remove your personal data within 30 days, though anonymized aggregate contributions
        (bathroom entries, ratings) may remain.
      </Paragraph>

      <SectionHeading>6. Your Rights</SectionHeading>
      <Paragraph>Depending on your jurisdiction, you may have the right to:</Paragraph>
      <BulletItem>Access your personal data.</BulletItem>
      <BulletItem>Request correction of inaccurate data.</BulletItem>
      <BulletItem>Request deletion of your account and personal data.</BulletItem>
      <BulletItem>Export your data in a portable format.</BulletItem>
      <BulletItem>Withdraw consent for personalized advertising.</BulletItem>
      <Paragraph>
        You can exercise these rights from the Profile tab in the app or by contacting us at
        privacy@pee-dom.app.
      </Paragraph>

      <SectionHeading>7. Children's Privacy</SectionHeading>
      <Paragraph>
        Pee-Dom is not directed at children under 13. We do not knowingly collect personal
        information from children under 13. If you believe a child has provided us data, contact us
        and we will delete it promptly.
      </Paragraph>

      <SectionHeading>8. Security</SectionHeading>
      <Paragraph>
        We use industry-standard measures including TLS encryption in transit, Row Level Security
        policies in our database, hashed passwords, and signed storage URLs to protect your data.
        No method of electronic storage is 100% secure, but we take reasonable precautions.
      </Paragraph>

      <SectionHeading>9. Changes to This Policy</SectionHeading>
      <Paragraph>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        through in-app notification or email. Continued use of the app after changes constitutes
        acceptance.
      </Paragraph>

      <SectionHeading>10. Contact Us</SectionHeading>
      <Paragraph>
        If you have questions about this Privacy Policy, contact us at privacy@pee-dom.app.
      </Paragraph>
    </>
  );
}

function TermsOfServiceContent() {
  return (
    <>
      <Text className="text-xs text-ink-500">Last updated: {TERMS_LAST_UPDATED}</Text>

      <Paragraph>
        These Terms of Service ("Terms") govern your use of the Pee-Dom mobile application ("App")
        operated by Pee-Dom ("we", "us", "our"). By creating an account or using the App, you agree
        to these Terms.
      </Paragraph>

      <SectionHeading>1. Eligibility</SectionHeading>
      <Paragraph>
        You must be at least 13 years old to use Pee-Dom. By using the App, you represent that you
        meet this age requirement.
      </Paragraph>

      <SectionHeading>2. User Accounts</SectionHeading>
      <Paragraph>
        You are responsible for maintaining the confidentiality of your account credentials. You
        agree to provide accurate information during registration and to keep it current. We reserve
        the right to suspend or terminate accounts that violate these Terms.
      </Paragraph>

      <SectionHeading>3. User-Generated Content</SectionHeading>
      <Paragraph>
        By submitting content (bathroom locations, access codes, ratings, photos, live status
        updates, or reports), you grant Pee-Dom a worldwide, non-exclusive, royalty-free license to
        use, display, and distribute that content within the App. You represent that:
      </Paragraph>
      <BulletItem>You have the right to submit the content.</BulletItem>
      <BulletItem>The content is accurate to the best of your knowledge.</BulletItem>
      <BulletItem>The content does not violate any law or third-party rights.</BulletItem>
      <BulletItem>The content does not contain obscene, abusive, or harmful material.</BulletItem>

      <SectionHeading>4. Prohibited Conduct</SectionHeading>
      <Paragraph>You agree not to:</Paragraph>
      <BulletItem>Submit false or misleading bathroom information.</BulletItem>
      <BulletItem>Upload inappropriate, explicit, or offensive photos.</BulletItem>
      <BulletItem>Harass, impersonate, or abuse other users.</BulletItem>
      <BulletItem>Manipulate the gamification system (points, badges, leaderboards) through fraudulent activity.</BulletItem>
      <BulletItem>Attempt to circumvent access controls, rate limits, or security measures.</BulletItem>
      <BulletItem>Use the App for any unlawful purpose.</BulletItem>

      <SectionHeading>5. Content Moderation</SectionHeading>
      <Paragraph>
        We may review, remove, or restrict content that violates these Terms or our community
        guidelines. Users can report issues through the in-app reporting system. We reserve the
        right to suspend contributors who repeatedly submit inaccurate or harmful content.
      </Paragraph>

      <SectionHeading>6. Business Claims</SectionHeading>
      <Paragraph>
        Business owners may claim bathroom locations through the StallPass Verified program. Claims
        are subject to verification. Verified businesses receive management tools and may purchase
        featured placements. We reserve the right to revoke verification for misrepresentation.
      </Paragraph>

      <SectionHeading>7. Premium Features and Payments</SectionHeading>
      <Paragraph>
        Certain features may require points redemption or paid subscription. Points are earned
        through contributions and cannot be purchased or transferred. Paid subscriptions are
        processed through the platform app store and subject to their refund policies.
      </Paragraph>

      <SectionHeading>8. Disclaimer of Warranties</SectionHeading>
      <Paragraph>
        Pee-Dom is provided "as is" without warranties of any kind. We do not guarantee the
        accuracy, availability, or safety of any bathroom listed in the App. Always exercise
        personal judgment when visiting locations found through the App.
      </Paragraph>

      <SectionHeading>9. Limitation of Liability</SectionHeading>
      <Paragraph>
        To the fullest extent permitted by law, Pee-Dom shall not be liable for any indirect,
        incidental, special, or consequential damages arising from your use of the App, including
        but not limited to reliance on bathroom information, access codes, or safety ratings.
      </Paragraph>

      <SectionHeading>10. Account Deletion</SectionHeading>
      <Paragraph>
        You may deactivate or permanently delete your account at any time from the Profile tab.
        Deactivation preserves your data in a disabled state. Deletion permanently removes your
        personal data within 30 days. Anonymized contributions may remain to preserve community data
        integrity.
      </Paragraph>

      <SectionHeading>11. Changes to These Terms</SectionHeading>
      <Paragraph>
        We may update these Terms from time to time. Material changes will be communicated through
        in-app notification. Continued use after changes constitutes acceptance.
      </Paragraph>

      <SectionHeading>12. Contact</SectionHeading>
      <Paragraph>
        Questions about these Terms? Contact us at support@pee-dom.app.
      </Paragraph>
    </>
  );
}

export default function LegalScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<LegalTab>(
    params.tab === 'terms' ? 'terms' : 'privacy'
  );

  const handleTabPress = useCallback((tab: LegalTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <View className="flex-row border-b border-surface-strong bg-surface-card px-4">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'privacy' }}
          className={[
            'flex-1 items-center py-3',
            activeTab === 'privacy' ? 'border-b-2 border-brand-600' : '',
          ].join(' ')}
          onPress={() => handleTabPress('privacy')}
        >
          <Text
            className={[
              'text-sm font-semibold',
              activeTab === 'privacy' ? 'text-brand-700' : 'text-ink-500',
            ].join(' ')}
          >
            Privacy Policy
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'terms' }}
          className={[
            'flex-1 items-center py-3',
            activeTab === 'terms' ? 'border-b-2 border-brand-600' : '',
          ].join(' ')}
          onPress={() => handleTabPress('terms')}
        >
          <Text
            className={[
              'text-sm font-semibold',
              activeTab === 'terms' ? 'text-brand-700' : 'text-ink-500',
            ].join(' ')}
          >
            Terms of Service
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 py-5 pb-10">
        {activeTab === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
      </ScrollView>
    </SafeAreaView>
  );
}
