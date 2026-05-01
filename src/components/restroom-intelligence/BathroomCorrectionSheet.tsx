import { memo, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import {
  getBathroomCorrectionOptions,
  type SupportedBathroomConfirmationField,
} from '@/lib/restroom-intelligence/field-confirmations';

interface BathroomCorrectionSheetProps {
  isOpen: boolean;
  bathroomName?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    fieldName: SupportedBathroomConfirmationField;
    value: unknown;
    notes?: string | null;
  }) => Promise<void> | void;
}

const ACCESS_OPTIONS = [
  'public',
  'customer_only',
  'ask_employee',
  'key_required',
  'code_required',
] as const;

const PRIVACY_OPTIONS = ['low', 'medium', 'high', 'single_user'] as const;

function BathroomCorrectionSheetComponent({
  isOpen,
  bathroomName,
  isSubmitting,
  onClose,
  onSubmit,
}: BathroomCorrectionSheetProps) {
  const [selectedField, setSelectedField] = useState<SupportedBathroomConfirmationField>('is_open');
  const [booleanValue, setBooleanValue] = useState<boolean>(true);
  const [stallCountText, setStallCountText] = useState('');
  const [accessTypeValue, setAccessTypeValue] = useState<(typeof ACCESS_OPTIONS)[number]>('public');
  const [privacyLevelValue, setPrivacyLevelValue] = useState<(typeof PRIVACY_OPTIONS)[number]>('medium');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fieldOptions = useMemo(() => getBathroomCorrectionOptions(), []);

  const resolvedField = fieldOptions.find((field) => field.fieldName === selectedField) ?? fieldOptions[0];

  const resolvedValue: unknown = useMemo(() => {
    if (selectedField === 'stall_count') {
      const parsed = Number.parseInt(stallCountText, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    if (selectedField === 'access_type') {
      return accessTypeValue;
    }

    if (selectedField === 'privacy_level') {
      return privacyLevelValue;
    }

    return booleanValue;
  }, [accessTypeValue, booleanValue, privacyLevelValue, selectedField, stallCountText]);

  const handleSubmit = async () => {
    if (selectedField === 'stall_count') {
      const trimmedStallCount = stallCountText.trim();
      const parsed = Number.parseInt(trimmedStallCount, 10);

      if (
        trimmedStallCount.length === 0 ||
        !Number.isFinite(parsed) ||
        parsed < 0 ||
        parsed.toString() !== trimmedStallCount
      ) {
        setValidationError('Enter a whole stall count of 0 or more.');
        return;
      }
    }

    setValidationError(null);
    await onSubmit({
      fieldName: selectedField,
      value: resolvedValue,
      notes: notes.trim() || null,
    });
    setNotes('');
  };

  return (
    <Modal animationType="slide" transparent visible={isOpen} onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/45" onPress={onClose}>
        <SafeAreaView className="flex-1 justify-end" edges={['bottom']}>
          <Pressable className="max-h-[90%] rounded-t-[30px] bg-surface-card" onPress={() => undefined}>
            <KeyboardAvoidingView
              className="max-h-[90%]"
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View className="px-5 pt-4">
                <View className="items-center">
                  <View className="h-1.5 w-14 rounded-full bg-surface-strong" />
                </View>
                <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px] text-ink-500">Quick correction</Text>
                <Text className="mt-2 text-2xl font-black text-ink-900">
                  {bathroomName ? `Update ${bathroomName}` : 'Update this bathroom'}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Pick one field, submit, and move on. Use report flow for wrong pins, duplicates, or long notes.
                </Text>
              </View>

              <ScrollView className="mt-5 px-5" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {fieldOptions.map((field) => {
                    const isSelected = selectedField === field.fieldName;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={[
                          'rounded-2xl border px-4 py-4',
                          isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                        ].join(' ')}
                        key={field.fieldName}
                        onPress={() => setSelectedField(field.fieldName)}
                      >
                        <Text className={['text-sm font-bold', isSelected ? 'text-brand-700' : 'text-ink-900'].join(' ')}>{field.label}</Text>
                        <Text className={['mt-1 text-xs leading-5', isSelected ? 'text-brand-700' : 'text-ink-600'].join(' ')}>{field.helperText}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-5 rounded-2xl border border-surface-strong bg-surface-base px-4 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Value</Text>
                  <Text className="mt-2 text-sm font-bold text-ink-900">{resolvedField.label}</Text>

                  {selectedField === 'stall_count' ? (
                    <TextInput
                      className="mt-3 rounded-xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
                      keyboardType="number-pad"
                      onChangeText={(value) => {
                        setStallCountText(value);
                        setValidationError(null);
                      }}
                      placeholder="Stall count"
                      placeholderTextColor="#94a3b8"
                      value={stallCountText}
                    />
                  ) : null}

                  {validationError ? (
                    <Text accessibilityRole="alert" className="mt-2 text-xs font-semibold text-danger">
                      {validationError}
                    </Text>
                  ) : null}

                  {selectedField === 'access_type' ? (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {ACCESS_OPTIONS.map((option) => (
                        <Pressable
                          className={[
                            'rounded-full border px-3 py-2',
                            accessTypeValue === option
                              ? 'border-brand-200 bg-brand-50'
                              : 'border-surface-strong bg-surface-card',
                          ].join(' ')}
                          key={option}
                          onPress={() => setAccessTypeValue(option)}
                        >
                          <Text className={accessTypeValue === option ? 'text-sm font-semibold text-brand-700' : 'text-sm font-semibold text-ink-700'}>{option.replace('_', ' ')}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  {selectedField === 'privacy_level' ? (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {PRIVACY_OPTIONS.map((option) => (
                        <Pressable
                          className={[
                            'rounded-full border px-3 py-2',
                            privacyLevelValue === option
                              ? 'border-brand-200 bg-brand-50'
                              : 'border-surface-strong bg-surface-card',
                          ].join(' ')}
                          key={option}
                          onPress={() => setPrivacyLevelValue(option)}
                        >
                          <Text className={privacyLevelValue === option ? 'text-sm font-semibold text-brand-700' : 'text-sm font-semibold text-ink-700'}>{option.replace('_', ' ')}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  {selectedField !== 'stall_count' && selectedField !== 'access_type' && selectedField !== 'privacy_level' ? (
                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        className={[
                          'flex-1 rounded-xl border px-4 py-3',
                          booleanValue
                            ? 'border-brand-200 bg-brand-50'
                            : 'border-surface-strong bg-surface-card',
                        ].join(' ')}
                        onPress={() => setBooleanValue(true)}
                      >
                        <Text className={booleanValue ? 'text-center text-sm font-semibold text-brand-700' : 'text-center text-sm font-semibold text-ink-700'}>Yes</Text>
                      </Pressable>
                      <Pressable
                        className={[
                          'flex-1 rounded-xl border px-4 py-3',
                          !booleanValue
                            ? 'border-brand-200 bg-brand-50'
                            : 'border-surface-strong bg-surface-card',
                        ].join(' ')}
                        onPress={() => setBooleanValue(false)}
                      >
                        <Text className={!booleanValue ? 'text-center text-sm font-semibold text-brand-700' : 'text-center text-sm font-semibold text-ink-700'}>No</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <View className="mt-4 rounded-2xl border border-surface-strong bg-surface-base px-4 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Notes (optional)</Text>
                  <TextInput
                    className="mt-2 min-h-[90px] rounded-xl border border-surface-strong bg-surface-card px-4 py-3 text-sm text-ink-900"
                    multiline
                    onChangeText={setNotes}
                    placeholder="Anything moderators should know?"
                    placeholderTextColor="#94a3b8"
                    textAlignVertical="top"
                    value={notes}
                  />
                </View>
              </ScrollView>

              <View className="mt-4 px-5 pb-6">
                <Button
                  disabled={isSubmitting}
                  label="Save correction"
                  loading={isSubmitting}
                  onPress={() => {
                    void handleSubmit();
                  }}
                />
                <Button className="mt-3" label="Cancel" onPress={onClose} variant="secondary" />
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

export const BathroomCorrectionSheet = memo(BathroomCorrectionSheetComponent);
