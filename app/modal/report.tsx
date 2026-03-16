import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useBathroomReports } from '@/hooks/useBathroomReports';
import { replaceSafely } from '@/lib/navigation';
import { ReportType } from '@/types';
import { getFieldErrors, reportCreateSchema, ReportCreateFormValues } from '@/utils/validate';

const REPORT_OPTIONS: Array<{ value: ReportType; label: string; description: string }> = [
  {
    value: 'closed',
    label: 'Closed',
    description: 'The bathroom was unavailable when I arrived.',
  },
  {
    value: 'wrong_code',
    label: 'Wrong code',
    description: 'The access code was invalid or outdated.',
  },
  {
    value: 'unsafe',
    label: 'Unsafe',
    description: 'The location felt unsafe or unsuitable.',
  },
  {
    value: 'incorrect_hours',
    label: 'Incorrect hours',
    description: 'The listed hours did not match reality.',
  },
  {
    value: 'no_restroom',
    label: 'No restroom',
    description: 'There is no public restroom at this spot.',
  },
  {
    value: 'duplicate',
    label: 'Duplicate',
    description: 'This appears to be a duplicate location.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Use notes to provide additional context.',
  },
];

type ReportFormState = {
  reportType: ReportType | null;
  notes: string;
};

export default function ReportBathroomModalScreen() {
  const router = useRouter();
  const { bathroom_id, report_type } = useLocalSearchParams<{
    bathroom_id?: string | string[];
    report_type?: ReportType | ReportType[] | string | string[];
  }>();
  const { isSubmitting, submitReport } = useBathroomReports();
  const preselectedReportType = useMemo(() => {
    const rawValue = Array.isArray(report_type) ? report_type[0] : report_type;

    if (!rawValue) {
      return null;
    }

    return REPORT_OPTIONS.some((option) => option.value === rawValue) ? (rawValue as ReportType) : null;
  }, [report_type]);
  const [formState, setFormState] = useState<ReportFormState>({
    reportType: preselectedReportType,
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReportCreateFormValues, string>>>({});

  const bathroomId = useMemo(() => {
    if (Array.isArray(bathroom_id)) {
      return bathroom_id[0] ?? '';
    }

    return bathroom_id ?? '';
  }, [bathroom_id]);

  const closeModal = useCallback(() => {
    if (bathroomId) {
      replaceSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
      return;
    }

    replaceSafely(router, routes.tabs.map, routes.tabs.map);
  }, [bathroomId, router]);

  const handleSubmit = useCallback(async () => {
    if (!formState.reportType) {
      setFieldErrors({
        report_type: 'Choose an issue type before submitting.',
      });
      return;
    }

    const parsedResult = reportCreateSchema.safeParse({
      bathroom_id: bathroomId,
      report_type: formState.reportType,
      notes: formState.notes,
    });

    if (!parsedResult.success) {
      setFieldErrors(getFieldErrors(parsedResult.error));
      return;
    }

    setFieldErrors({});

    try {
      const outcome = await submitReport({
        bathroom_id: parsedResult.data.bathroom_id,
        report_type: parsedResult.data.report_type,
        notes: parsedResult.data.notes,
      });

      if (outcome !== 'auth_required') {
        closeModal();
      }
    } catch (error) {
      // The hook already shows a user-facing error toast.
    }
  }, [bathroomId, closeModal, formState.notes, formState.reportType, submitReport]);

  if (!bathroomId) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6">
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Cannot submit this report</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              We could not identify the bathroom you wanted to report.
            </Text>
            <Button className="mt-6" label="Back To Map" onPress={closeModal} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
          <View className="px-6 py-8">
            <View className="rounded-[30px] bg-danger px-5 py-5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Report Issue</Text>
              <Text className="mt-2 text-3xl font-black tracking-tight text-white">Help keep data trustworthy.</Text>
              <Text className="mt-2 text-sm leading-6 text-white/85">
                Select what went wrong and add details. We use reports to protect map quality.
              </Text>
              {preselectedReportType === 'wrong_code' ? (
                <Text className="mt-3 text-sm leading-6 text-white">
                  Wrong code is already selected because you marked this access code as failed.
                </Text>
              ) : null}
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Issue Type</Text>
              <View className="mt-4 gap-3">
                {REPORT_OPTIONS.map((option) => {
                  const isSelected = formState.reportType === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className={[
                        'rounded-2xl border px-4 py-4',
                        isSelected ? 'border-danger bg-danger/10' : 'border-surface-strong bg-surface-base',
                      ].join(' ')}
                      key={option.value}
                      onPress={() => {
                        setFieldErrors((currentErrors) => ({
                          ...currentErrors,
                          report_type: undefined,
                        }));
                        setFormState((currentState) => ({
                          ...currentState,
                          reportType: option.value,
                        }));
                      }}
                    >
                      <Text className={['text-base font-bold', isSelected ? 'text-danger' : 'text-ink-900'].join(' ')}>
                        {option.label}
                      </Text>
                      <Text className={['mt-1 text-sm', isSelected ? 'text-danger' : 'text-ink-600'].join(' ')}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.report_type ? (
                <Text className="mt-3 text-sm text-danger">{fieldErrors.report_type}</Text>
              ) : null}
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Input
                autoCapitalize="sentences"
                label="Additional details (optional)"
                maxLength={500}
                multiline
                numberOfLines={4}
                onChangeText={(notesValue) => {
                  setFieldErrors((currentErrors) => ({
                    ...currentErrors,
                    notes: undefined,
                  }));
                  setFormState((currentState) => ({
                    ...currentState,
                    notes: notesValue,
                  }));
                }}
                placeholder="Add details that help us verify this issue."
                textAlignVertical="top"
                value={formState.notes}
                error={fieldErrors.notes}
                inputClassName="min-h-[110px]"
              />
            </View>

            <View className="mt-6 gap-3">
              <Button
                label="Submit Report"
                loading={isSubmitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />
              <Button
                label="Cancel"
                onPress={closeModal}
                variant="secondary"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
