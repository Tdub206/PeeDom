import { memo, useCallback, useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import type { EarlyAdopterInvite, GenerateInviteInput } from '@/types';

interface EarlyAdopterBannerProps {
  invites: EarlyAdopterInvite[];
  isGenerating: boolean;
  onGenerate: (input: GenerateInviteInput) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function InviteRow({ invite }: { invite: EarlyAdopterInvite }) {
  const isExpired = invite.status === 'expired' || new Date(invite.expires_at) < new Date();
  const isRedeemed = invite.status === 'redeemed';

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `You're invited to join StallPass as a Lifetime Verified Business!\n\nUse this code within 30 days: ${invite.invite_token}\n\nOr open: stallpass://invite/${invite.invite_token}`,
      });
    } catch {
      // User cancelled
    }
  }, [invite.invite_token]);

  return (
    <View className="rounded-2xl border border-surface-strong bg-surface-base p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          {invite.target_business_name ? (
            <Text className="text-sm font-semibold text-ink-900">{invite.target_business_name}</Text>
          ) : null}
          <Text className="font-mono mt-1 text-xl font-black tracking-widest text-brand-600">
            {invite.invite_token}
          </Text>
        </View>
        <View
          className={[
            'rounded-full px-3 py-1',
            isRedeemed
              ? 'bg-success/10'
              : isExpired
                ? 'bg-danger/10'
                : 'bg-warning/10',
          ].join(' ')}
        >
          <Text
            className={[
              'text-xs font-bold uppercase',
              isRedeemed ? 'text-success' : isExpired ? 'text-danger' : 'text-warning',
            ].join(' ')}
          >
            {invite.status}
          </Text>
        </View>
      </View>

      {invite.target_email ? (
        <Text className="mt-1 text-sm text-ink-500">{invite.target_email}</Text>
      ) : null}

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-xs text-ink-500">
          {isRedeemed
            ? `Redeemed ${invite.redeemed_at ? formatDate(invite.redeemed_at) : ''} by ${invite.redeemer_display_name ?? 'Unknown'}`
            : `Expires ${formatDate(invite.expires_at)}`}
        </Text>
        {invite.status === 'pending' ? (
          <Pressable hitSlop={8} onPress={handleShare}>
            <Text className="text-sm font-semibold text-brand-600">Share</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EarlyAdopterBannerComponent({ invites, isGenerating, onGenerate }: EarlyAdopterBannerProps) {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleGenerate = useCallback(() => {
    onGenerate({
      target_business_name: businessName.trim() || null,
      target_email: email.trim() || null,
      expiry_days: 30,
    });
    setBusinessName('');
    setEmail('');
    setShowForm(false);
  }, [businessName, email, onGenerate]);

  const pendingCount = invites.filter((i) => i.status === 'pending').length;
  const redeemedCount = invites.filter((i) => i.status === 'redeemed').length;

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">
        Early Adopter Program
      </Text>
      <Text className="mt-2 text-base leading-6 text-ink-600">
        Generate 30-day invite codes for businesses. Redeemed invites grant lifetime-free StallPass verification.
      </Text>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-warning/10 px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-warning">Pending</Text>
          <Text className="mt-1 text-2xl font-black text-warning">{pendingCount}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-success/10 px-4 py-3">
          <Text className="text-xs font-semibold uppercase text-success">Redeemed</Text>
          <Text className="mt-1 text-2xl font-black text-success">{redeemedCount}</Text>
        </View>
      </View>

      {showForm ? (
        <View className="mt-4">
          <TextInput
            className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-base text-ink-900"
            onChangeText={setBusinessName}
            placeholder="Business name (optional)"
            placeholderTextColor="#94a3b8"
            value={businessName}
          />
          <TextInput
            autoCapitalize="none"
            className="mt-3 rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-base text-ink-900"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Contact email (optional)"
            placeholderTextColor="#94a3b8"
            value={email}
          />
          <View className="mt-4 flex-row gap-3">
            <Button
              className="flex-1"
              label="Generate Invite"
              loading={isGenerating}
              onPress={handleGenerate}
            />
            <Button
              className="flex-1"
              label="Cancel"
              onPress={() => setShowForm(false)}
              variant="ghost"
            />
          </View>
        </View>
      ) : (
        <Button
          className="mt-4"
          label="Generate New Invite"
          onPress={() => setShowForm(true)}
          variant="secondary"
        />
      )}

      {invites.length > 0 ? (
        <View className="mt-4 gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
            Recent Invites
          </Text>
          {invites.slice(0, 10).map((invite) => (
            <InviteRow invite={invite} key={invite.id} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const EarlyAdopterBanner = memo(EarlyAdopterBannerComponent);
