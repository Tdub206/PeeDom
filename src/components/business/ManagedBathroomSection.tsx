import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  useBusinessBathroomSettings,
  useBusinessPromotions,
  useUpdateBusinessBathroomSettings,
  useUpsertBusinessPromotion,
} from '@/hooks/useBusiness';
import { useToast } from '@/hooks/useToast';
import type {
  BusinessDashboardBathroom,
  BusinessPromotion,
  BusinessPromotionType,
  UpdateBusinessBathroomSettingsInput,
  UpsertBusinessPromotionInput,
} from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { ClaimedBathroomCard } from './ClaimedBathroomCard';

interface ManagedBathroomSectionProps {
  bathroom: BusinessDashboardBathroom;
  onManageHours: (bathroomId: string) => void;
  onOpenBathroom: (bathroomId: string) => void;
  onRequestFeatured?: (bathroomId: string) => void;
}

interface PromotionFormState {
  id: string | null;
  title: string;
  description: string;
  offer_type: BusinessPromotionType;
  offer_value: string;
  promo_code: string;
  redemption_instructions: string;
  is_active: boolean;
}

const OFFER_TYPE_LABELS: Record<BusinessPromotionType, string> = {
  percentage: 'Percent Off',
  amount_off: 'Dollar Off',
  freebie: 'Freebie',
  custom: 'Custom',
};

function createEmptyPromotionForm(): PromotionFormState {
  return {
    id: null,
    title: '',
    description: '',
    offer_type: 'percentage',
    offer_value: '',
    promo_code: '',
    redemption_instructions: '',
    is_active: true,
  };
}

function buildPromotionFormFromRow(promotion: BusinessPromotion): PromotionFormState {
  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    offer_type: promotion.offer_type,
    offer_value: typeof promotion.offer_value === 'number' ? String(promotion.offer_value) : '',
    promo_code: promotion.promo_code ?? '',
    redemption_instructions: promotion.redemption_instructions,
    is_active: promotion.is_active,
  };
}

function formatPromotionValue(promotion: Pick<BusinessPromotion, 'offer_type' | 'offer_value'>): string {
  switch (promotion.offer_type) {
    case 'percentage':
      return typeof promotion.offer_value === 'number' ? `${promotion.offer_value}% off` : 'Percent offer';
    case 'amount_off':
      return typeof promotion.offer_value === 'number' ? `$${promotion.offer_value.toFixed(2)} off` : 'Amount-off offer';
    case 'freebie':
      return 'Freebie';
    case 'custom':
    default:
      return 'Custom offer';
  }
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
    <View className="flex-row items-center justify-between gap-4 rounded-2xl bg-surface-base px-4 py-4">
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink-900">{label}</Text>
        <Text className="mt-1 text-sm leading-5 text-ink-600">{body}</Text>
      </View>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </View>
  );
}

function ManagedBathroomSectionComponent({
  bathroom,
  onManageHours,
  onOpenBathroom,
  onRequestFeatured,
}: ManagedBathroomSectionProps) {
  const { showToast } = useToast();
  const settingsQuery = useBusinessBathroomSettings(bathroom.bathroom_id);
  const promotionsQuery = useBusinessPromotions(bathroom.bathroom_id);
  const settingsMutation = useUpdateBusinessBathroomSettings();
  const promotionMutation = useUpsertBusinessPromotion();
  const [settingsDraft, setSettingsDraft] = useState<UpdateBusinessBathroomSettingsInput>({
    bathroom_id: bathroom.bathroom_id,
    requires_premium_access: bathroom.requires_premium_access,
    show_on_free_map: bathroom.show_on_free_map,
    is_location_verified: bathroom.is_location_verified,
  });
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(() => createEmptyPromotionForm());

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

  const handleEditPromotion = useCallback((promotion: BusinessPromotion) => {
    setPromotionForm(buildPromotionFormFromRow(promotion));
  }, []);

  const resetPromotionForm = useCallback(() => {
    setPromotionForm(createEmptyPromotionForm());
  }, []);

  const handleSavePromotion = useCallback(async () => {
    try {
      const numericValue = promotionForm.offer_value.trim().length
        ? Number.parseFloat(promotionForm.offer_value.trim())
        : null;
      const input: UpsertBusinessPromotionInput = {
        id: promotionForm.id,
        bathroom_id: bathroom.bathroom_id,
        title: promotionForm.title,
        description: promotionForm.description,
        offer_type: promotionForm.offer_type,
        offer_value: Number.isFinite(numericValue ?? NaN) ? numericValue : null,
        promo_code: promotionForm.promo_code.trim() || null,
        redemption_instructions: promotionForm.redemption_instructions,
        is_active: promotionForm.is_active,
      };

      await promotionMutation.mutateAsync(input);
      resetPromotionForm();
      showToast({
        title: 'Offer saved',
        message: `Updated StallPass offers for ${bathroom.place_name}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Offer failed',
        message: getErrorMessage(error, 'Unable to save this StallPass offer right now.'),
        variant: 'error',
      });
    }
  }, [bathroom.bathroom_id, bathroom.place_name, promotionForm, promotionMutation, resetPromotionForm, showToast]);

  const handleTogglePromotion = useCallback(
    async (promotion: BusinessPromotion) => {
      try {
        await promotionMutation.mutateAsync({
          id: promotion.id,
          bathroom_id: promotion.bathroom_id,
          title: promotion.title,
          description: promotion.description,
          offer_type: promotion.offer_type,
          offer_value: promotion.offer_value,
          promo_code: promotion.promo_code,
          redemption_instructions: promotion.redemption_instructions,
          starts_at: promotion.starts_at,
          ends_at: promotion.ends_at,
          is_active: !promotion.is_active,
        });

        showToast({
          title: promotion.is_active ? 'Offer paused' : 'Offer reactivated',
          message: `${promotion.title} was updated for ${bathroom.place_name}.`,
          variant: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Offer update failed',
          message: getErrorMessage(error, 'Unable to update this StallPass offer right now.'),
          variant: 'error',
        });
      }
    },
    [bathroom.place_name, promotionMutation, showToast]
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
          Premium-only StallPass verification means premium members can discover this restroom even when it is hidden from the free map. Use the free-map toggle when you want broader visibility without removing the premium promise.
        </Text>

        <View className="mt-4 gap-3">
          <SettingsToggleRow
            label="StallPass Verified"
            body="Hide this location from the free map and reserve it for premium members."
            value={settingsDraft.requires_premium_access}
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                requires_premium_access: nextValue,
                show_on_free_map: nextValue ? currentValue.show_on_free_map : true,
              }))
            }
          />
          <SettingsToggleRow
            label="Also Show On Free Map"
            body="Keep this premium partner visible to free users as well."
            disabled={!settingsDraft.requires_premium_access}
            value={settingsDraft.requires_premium_access ? settingsDraft.show_on_free_map : true}
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                show_on_free_map: nextValue,
              }))
            }
          />
          <SettingsToggleRow
            label="Location Verified"
            body="Mark the stored address and restroom coordinates as confirmed for this business."
            value={settingsDraft.is_location_verified}
            onValueChange={(nextValue) =>
              setSettingsDraft((currentValue) => ({
                ...currentValue,
                is_location_verified: nextValue,
              }))
            }
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
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Offers And Coupons</Text>
        <Text className="mt-2 text-base leading-6 text-ink-600">
          Create in-store offers for StallPass users, such as premium-member discounts, freebies, or “show us your StallPass visit” redemptions.
        </Text>

        {promotionsQuery.error ? (
          <Text className="mt-4 text-sm leading-6 text-danger">
            {getErrorMessage(promotionsQuery.error, 'Unable to load StallPass offers right now.')}
          </Text>
        ) : promotionsQuery.data?.length ? (
          <View className="mt-4 gap-3">
            {promotionsQuery.data.map((promotion) => (
              <View className="rounded-2xl bg-surface-base px-4 py-4" key={promotion.id}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink-900">{promotion.title}</Text>
                    <Text className="mt-1 text-sm font-semibold text-brand-700">
                      {formatPromotionValue(promotion)}
                    </Text>
                  </View>
                  <View
                    className={[
                      'rounded-full px-3 py-2',
                      promotion.is_active ? 'bg-success/10' : 'bg-surface-card',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-xs font-black uppercase tracking-[1px]',
                        promotion.is_active ? 'text-success' : 'text-ink-600',
                      ].join(' ')}
                    >
                      {promotion.is_active ? 'Active' : 'Paused'}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm leading-6 text-ink-600">{promotion.description}</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  {promotion.redemption_instructions}
                </Text>
                {promotion.promo_code ? (
                  <Text className="mt-2 text-sm font-semibold text-ink-900">
                    Code: {promotion.promo_code}
                  </Text>
                ) : null}
                <View className="mt-4 flex-row gap-3">
                  <Button
                    fullWidth={false}
                    label="Edit"
                    onPress={() => handleEditPromotion(promotion)}
                    variant="secondary"
                  />
                  <Button
                    fullWidth={false}
                    label={promotion.is_active ? 'Pause' : 'Activate'}
                    loading={promotionMutation.isPending}
                    onPress={() => {
                      void handleTogglePromotion(promotion);
                    }}
                    variant="ghost"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
            <Text className="text-base font-semibold text-ink-900">No active offers yet</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Add your first StallPass promotion so premium members have a reason to stop in after using your restroom.
            </Text>
          </View>
        )}

        <View className="mt-5 rounded-[24px] border border-surface-strong bg-surface-base p-4">
          <Text className="text-base font-bold text-ink-900">
            {promotionForm.id ? 'Edit Offer' : 'Create Offer'}
          </Text>

          <Input
            containerClassName="mt-4"
            label="Offer Title"
            onChangeText={(value) => setPromotionForm((currentValue) => ({ ...currentValue, title: value }))}
            placeholder="10% off after your StallPass visit"
            value={promotionForm.title}
          />

          <Input
            containerClassName="mt-4"
            label="Offer Description"
            onChangeText={(value) => setPromotionForm((currentValue) => ({ ...currentValue, description: value }))}
            placeholder="Reward premium members who stop in after using your restroom."
            value={promotionForm.description}
          />

          <View className="mt-4">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Offer Type</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {(Object.keys(OFFER_TYPE_LABELS) as BusinessPromotionType[]).map((offerType) => (
                <Pressable
                  className={[
                    'rounded-full border px-3 py-2',
                    promotionForm.offer_type === offerType
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-surface-strong bg-surface-card',
                  ].join(' ')}
                  key={offerType}
                  onPress={() =>
                    setPromotionForm((currentValue) => ({
                      ...currentValue,
                      offer_type: offerType,
                      offer_value:
                        offerType === 'freebie' || offerType === 'custom' ? '' : currentValue.offer_value,
                    }))
                  }
                >
                  <Text
                    className={[
                      'text-sm font-semibold',
                      promotionForm.offer_type === offerType ? 'text-brand-700' : 'text-ink-700',
                    ].join(' ')}
                  >
                    {OFFER_TYPE_LABELS[offerType]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {promotionForm.offer_type === 'percentage' || promotionForm.offer_type === 'amount_off' ? (
            <Input
              containerClassName="mt-4"
              keyboardType="decimal-pad"
              label={promotionForm.offer_type === 'percentage' ? 'Discount Percent' : 'Dollar Discount'}
              onChangeText={(value) => setPromotionForm((currentValue) => ({ ...currentValue, offer_value: value }))}
              placeholder={promotionForm.offer_type === 'percentage' ? '10' : '5.00'}
              value={promotionForm.offer_value}
            />
          ) : null}

          <Input
            containerClassName="mt-4"
            label="Promo Code (optional)"
            onChangeText={(value) => setPromotionForm((currentValue) => ({ ...currentValue, promo_code: value }))}
            placeholder="STALLPASS10"
            value={promotionForm.promo_code}
          />

          <Input
            containerClassName="mt-4"
            label="Redemption Instructions"
            onChangeText={(value) =>
              setPromotionForm((currentValue) => ({
                ...currentValue,
                redemption_instructions: value,
              }))
            }
            placeholder="Show the business dashboard screenshot or mention StallPass at checkout."
            value={promotionForm.redemption_instructions}
          />

          <SettingsToggleRow
            body="Inactive offers stay saved here but stop appearing in your active promotion count."
            label="Offer Active"
            value={promotionForm.is_active}
            onValueChange={(nextValue) =>
              setPromotionForm((currentValue) => ({
                ...currentValue,
                is_active: nextValue,
              }))
            }
          />

          <View className="mt-4 gap-3">
            <Button
              label={promotionForm.id ? 'Update Offer' : 'Create Offer'}
              loading={promotionMutation.isPending}
              onPress={() => {
                void handleSavePromotion();
              }}
            />
            <Button
              label="Reset Offer Form"
              onPress={resetPromotionForm}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export const ManagedBathroomSection = memo(ManagedBathroomSectionComponent);
