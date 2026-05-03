import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import {
  useBusinessBathroomSettings,
  useUpdateBusinessBathroomSettings,
} from '@/hooks/useBusiness';
import { useToast } from '@/hooks/useToast';
import type {
  BusinessDashboardBathroom,
  UpdateBusinessBathroomSettingsInput,
} from '@/types';
import { buildManagedBathroomChecklist } from '@/utils/business-dashboard';
import { getErrorMessage } from '@/utils/errorMap';
import { ClaimedBathroomCard } from './ClaimedBathroomCard';

interface ManagedBathroomSectionProps {
  bathroom: BusinessDashboardBathroom;
  activeCouponCount?: number;
  onManageHours: (bathroomId: string) => void;
  onOpenBathroom: (bathroomId: string) => void;
  onOpenCouponEditor?: (bathroomId: string) => void;
  onRequestFeatured?: (bathroomId: string) => void;
}

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return timestamp.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SettingsToggleRow({
  label,
  body,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  body: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="rounded-2xl bg-surface-base px-4 py-4">
      <Text className="text-base font-semibold text-ink-900">{label}</Text>
      <Text className="mt-1 text-sm leading-5 text-ink-600">{body}</Text>
      <Button
        className="mt-4"
        disabled={disabled}
        fullWidth={false}
        label={value ? 'On' : 'Off'}
        onPress={() => onValueChange(!value)}
        variant={value ? 'primary' : 'secondary'}
      />
    </View>
  );
}

function ManagedBathroomSectionComponent({
  bathroom,
  activeCouponCount = 0,
  onManageHours,
  onOpenBathroom,
  onOpenCouponEditor,
  onRequestFeatured,
}: ManagedBathroomSectionProps) {
  const { showToast } = useToast();
  const settingsQuery = useBusinessBathroomSettings(bathroom.bathroom_id);
  const settingsMutation = useUpdateBusinessBathroomSettings();
  const [settingsDraft, setSettingsDraft] = useState<UpdateBusinessBathroomSettingsInput>({
    bathroom_id: bathroom.bathroom_id,
    requires_premium_access: bathroom.requires_premium_access,
    show_on_free_map: bathroom.show_on_free_map,
    is_location_verified: bathroom.is_location_verified,
  });

  useEffect(() => {
    const source = settingsQuery.data;

    setSettingsDraft({
      bathroom_id: bathroom.bathroom_id,
      requires_premium_access: source?.requires_premium_access ?? bathroom.requires_premium_access,
      show_on_free_map: source?.show_on_free_map ?? bathroom.show_on_free_map,
      is_location_verified: source?.is_location_verified ?? bathroom.is_location_verified,
    });
  }, [
    bathroom.bathroom_id,
    bathroom.is_location_verified,
    bathroom.requires_premium_access,
    bathroom.show_on_free_map,
    settingsQuery.data,
  ]);

  const locationVerifiedLabel = useMemo(() => {
    const resolvedDate =
      settingsQuery.data?.location_verified_at ??
      bathroom.location_verified_at ??
      null;

    return formatTimestamp(resolvedDate);
  }, [bathroom.location_verified_at, settingsQuery.data?.location_verified_at]);

  const handleSaveSettings = useCallback(async () => {
    try {
      await settingsMutation.mutateAsync({
        ...settingsDraft,
        show_on_free_map: settingsDraft.requires_premium_access ? settingsDraft.show_on_free_map : true,
      });

      showToast({
        title: 'StallPass settings saved',
        message: `Updated map visibility and verification settings for ${bathroom.place_name}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Settings failed',
        message: getErrorMessage(error, 'Unable to save these StallPass settings right now.'),
        variant: 'error',
      });
    }
  }, [bathroom.place_name, settingsDraft, settingsMutation, showToast]);

  const couponSummary =
    activeCouponCount > 0
      ? `${activeCouponCount} active coupon${activeCouponCount === 1 ? '' : 's'} visible in StallPass.`
      : 'No active coupons yet. Add one to give StallPass users a reason to stop in.';
  const verificationChecklist = useMemo(
    () => buildManagedBathroomChecklist(bathroom, activeCouponCount),
    [activeCouponCount, bathroom]
  );

  return (
    <View className="gap-4">
      <ClaimedBathroomCard
        bathroom={bathroom}
        onManageHours={onManageHours}
        onOpenBathroom={onOpenBathroom}
        onRequestFeatured={onRequestFeatured}
      />

      <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">StallPass Listing</Text>
        <Text className="mt-2 text-base leading-6 text-ink-600">
          Verified businesses win when discovery, trust, and control move together. Set how this restroom appears on the map, confirm the saved pin, and decide whether premium discovery is part of the offer.
        </Text>

        <View className="mt-4 gap-3">
          <SettingsToggleRow
            body="Hide this location from the free map and reserve it for premium members."
            label="Premium-only listing"
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                requires_premium_access: nextValue,
                show_on_free_map: nextValue ? currentValue.show_on_free_map : true,
              }))
            }
            value={settingsDraft.requires_premium_access}
          />
          <SettingsToggleRow
            body="Keep this premium partner visible to free users as well."
            disabled={!settingsDraft.requires_premium_access}
            label="Also Show On Free Map"
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                show_on_free_map: nextValue,
              }))
            }
            value={settingsDraft.requires_premium_access ? settingsDraft.show_on_free_map : true}
          />
          <SettingsToggleRow
            body="Mark the stored address and restroom coordinates as confirmed for this business."
            label="Location Verified"
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                is_location_verified: nextValue,
              }))
            }
            value={settingsDraft.is_location_verified}
          />
        </View>

        <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
          <Text className="text-sm font-semibold text-ink-900">
            {bathroom.pricing_plan === 'lifetime' ? 'Lifetime launch access is active.' : 'Standard billing plan.'}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">
            {locationVerifiedLabel
              ? `Location was last verified on ${locationVerifiedLabel}.`
              : 'Location verification has not been saved for this business yet.'}
          </Text>
        </View>

        <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Verified program checklist</Text>
          <View className="mt-3 gap-3">
            {verificationChecklist.map((item) => (
              <View className="rounded-2xl bg-surface-card px-4 py-4" key={item.label}>
                <Text className={['text-sm font-bold', item.complete ? 'text-success' : 'text-ink-900'].join(' ')}>
                  {item.complete ? 'Ready' : 'Needs work'}: {item.label}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-600">{item.detail}</Text>
              </View>
            ))}
          </View>
        </View>

        {settingsQuery.error ? (
          <Text className="mt-4 text-sm leading-6 text-danger">
            {getErrorMessage(settingsQuery.error, 'Unable to load the latest StallPass settings right now.')}
          </Text>
        ) : null}

        <Button
          className="mt-5"
          label="Save StallPass Settings"
          loading={settingsMutation.isPending}
          onPress={() => {
            void handleSaveSettings();
          }}
        />
      </View>

      <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Coupons & Discounts</Text>
        <Text className="mt-2 text-base leading-6 text-ink-600">{couponSummary}</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">
          Premium users see active coupons on the bathroom detail screen after they find your restroom in StallPass.
        </Text>
        {onOpenCouponEditor ? (
          <Button
            className="mt-5"
            label={activeCouponCount > 0 ? 'Create Another Coupon' : 'Create Your First Coupon'}
            onPress={() => onOpenCouponEditor(bathroom.bathroom_id)}
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

export const ManagedBathroomSection = memo(ManagedBathroomSectionComponent);
