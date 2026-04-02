import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import type { CouponType, CreateCouponInput } from '@/types';

interface CouponEditorSheetProps {
  visible: boolean;
  bathroomId: string | null;
  onClose: () => void;
  onSubmit: (input: CreateCouponInput) => void;
  isSubmitting?: boolean;
}

const COUPON_TYPES: { value: CouponType; label: string; needsValue: boolean }[] = [
  { value: 'percent_off', label: '% Off', needsValue: true },
  { value: 'dollar_off', label: '$ Off', needsValue: true },
  { value: 'bogo', label: 'Buy One Get One', needsValue: false },
  { value: 'free_item', label: 'Free Item', needsValue: false },
  { value: 'custom', label: 'Custom', needsValue: false },
];

const EXPIRY_PRESETS = [
  { label: 'No Expiration', days: null },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

function CouponEditorSheetComponent({
  visible,
  bathroomId,
  onClose,
  onSubmit,
  isSubmitting,
}: CouponEditorSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<CouponType>('percent_off');
  const [value, setValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiryDays, setExpiryDays] = useState<number | null>(30);
  const [premiumOnly, setPremiumOnly] = useState(true);
  const [minPurchase, setMinPurchase] = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setSelectedType('percent_off');
      setValue('');
      setCouponCode('');
      setMaxRedemptions('');
      setExpiryDays(30);
      setPremiumOnly(true);
      setMinPurchase('');
    }
  }, [visible]);

  const selectedTypeConfig = useMemo(
    () => COUPON_TYPES.find((t) => t.value === selectedType),
    [selectedType]
  );

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (selectedTypeConfig?.needsValue && (!value || Number(value) <= 0)) return false;
    if (selectedType === 'percent_off' && Number(value) > 100) return false;
    return true;
  }, [title, selectedType, selectedTypeConfig, value]);

  const handleSubmit = useCallback(() => {
    if (!bathroomId || !isValid) return;

    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    onSubmit({
      bathroom_id: bathroomId,
      title: title.trim(),
      description: description.trim() || null,
      coupon_type: selectedType,
      value: selectedTypeConfig?.needsValue ? Number(value) : null,
      min_purchase: minPurchase ? Number(minPurchase) : null,
      coupon_code: couponCode.trim() || null,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      expires_at: expiresAt,
      premium_only: premiumOnly,
    });
  }, [
    bathroomId, isValid, title, description, selectedType,
    value, minPurchase, couponCode, maxRedemptions,
    expiryDays, premiumOnly, onSubmit, selectedTypeConfig,
  ]);

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={false}
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-surface-base"
      >
        <View className="flex-row items-center justify-between border-b border-surface-strong px-6 pb-4 pt-6">
          <Text className="text-2xl font-black text-ink-900">Create Coupon</Text>
          <Pressable hitSlop={12} onPress={onClose}>
            <Text className="text-base font-semibold text-brand-600">Cancel</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
          <View className="py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Coupon Title
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
              maxLength={100}
              onChangeText={setTitle}
              placeholder="e.g. 10% off when you show StallPass"
              placeholderTextColor="#94a3b8"
              value={title}
            />

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Coupon Type
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {COUPON_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  onPress={() => setSelectedType(type.value)}
                >
                  <View
                    className={[
                      'rounded-full border px-4 py-2',
                      selectedType === type.value
                        ? 'border-brand-600 bg-brand-600/10'
                        : 'border-surface-strong bg-surface-card',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-sm font-semibold',
                        selectedType === type.value ? 'text-brand-600' : 'text-ink-600',
                      ].join(' ')}
                    >
                      {type.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {selectedTypeConfig?.needsValue ? (
              <>
                <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
                  {selectedType === 'percent_off' ? 'Percentage' : 'Dollar Amount'}
                </Text>
                <TextInput
                  className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
                  keyboardType="numeric"
                  onChangeText={setValue}
                  placeholder={selectedType === 'percent_off' ? 'e.g. 10' : 'e.g. 5.00'}
                  placeholderTextColor="#94a3b8"
                  value={value}
                />
              </>
            ) : null}

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Description (optional)
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
              maxLength={500}
              multiline
              numberOfLines={3}
              onChangeText={setDescription}
              placeholder="Tell customers what they get"
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
              value={description}
            />

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Coupon Code (auto-generated if blank)
            </Text>
            <TextInput
              autoCapitalize="characters"
              className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 font-mono text-base text-ink-900"
              maxLength={30}
              onChangeText={setCouponCode}
              placeholder="e.g. STALLPASS10"
              placeholderTextColor="#94a3b8"
              value={couponCode}
            />

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Min. Purchase (optional)
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
              keyboardType="numeric"
              onChangeText={setMinPurchase}
              placeholder="e.g. 10.00"
              placeholderTextColor="#94a3b8"
              value={minPurchase}
            />

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Max Redemptions (optional)
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
              keyboardType="number-pad"
              onChangeText={setMaxRedemptions}
              placeholder="Unlimited if blank"
              placeholderTextColor="#94a3b8"
              value={maxRedemptions}
            />

            <Text className="mt-6 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
              Expiration
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {EXPIRY_PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  onPress={() => setExpiryDays(preset.days)}
                >
                  <View
                    className={[
                      'rounded-full border px-4 py-2',
                      expiryDays === preset.days
                        ? 'border-brand-600 bg-brand-600/10'
                        : 'border-surface-strong bg-surface-card',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-sm font-semibold',
                        expiryDays === preset.days ? 'text-brand-600' : 'text-ink-600',
                      ].join(' ')}
                    >
                      {preset.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="mt-6 flex-row items-center justify-between rounded-2xl border border-surface-strong bg-surface-card p-4">
              <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-ink-900">Premium Only</Text>
                <Text className="mt-1 text-sm text-ink-600">
                  Only StallPass Premium users can see and redeem this coupon.
                </Text>
              </View>
              <Switch
                onValueChange={setPremiumOnly}
                thumbColor="#ffffff"
                trackColor={{ false: '#cbd5e1', true: colors.brand[600] }}
                value={premiumOnly}
              />
            </View>

            <Button
              className="mt-8"
              disabled={!isValid}
              label="Create Coupon"
              loading={isSubmitting}
              onPress={handleSubmit}
            />

            <View className="h-12" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const CouponEditorSheet = memo(CouponEditorSheetComponent);
