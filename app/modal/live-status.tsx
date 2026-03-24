import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchBathroomDetailById, PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomLiveStatus } from '@/hooks/useBathroomLiveStatus';
import { useToast } from '@/hooks/useToast';
import { liveStatusDrafts } from '@/lib/draft-manager';
import {
  formatBathroomStatusTimestamp,
  getBathroomStatusEmoji,
  getBathroomStatusLabel,
  getBathroomStatusTone,
} from '@/lib/bathroom-status';
import { TermsGate } from '@/components/TermsGate';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import type { BathroomLiveStatus } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import {
  FieldErrors,
  getFieldErrors,
  liveStatusReportSchema,
  LiveStatusReportFormValues,
} from '@/utils/validate';

interface LiveStatusFormState {
  status: BathroomLiveStatus | null;
  note: string;
}

interface LiveStatusDraftShape {
  bathroom_id: string;
  status: BathroomLiveStatus;
  note?: string;
}

const STATUS_OPTIONS: Array<{
  status: BathroomLiveStatus;
  label: string;
  description: string;
}> = [
  {
    status: 'clean',
    label: 'Recently cleaned',
    description: 'Everything looked stocked and ready to use.',
  },
  {
    status: 'dirty',
    label: 'Needs cleaning',
    description: 'The bathroom was usable but noticeably unclean.',
  },
  {
    status: 'closed',
    label: 'Reported closed',
    description: 'The restroom was locked or unavailable when you arrived.',
  },
  {
    status: 'out_of_order',
    label: 'Out of order',
    description: 'Fixtures or access were broken enough that the stop was unusable.',
  },
  {
    status: 'long_wait',
    label: 'Long wait',
    description: 'The line or access delay was much longer than expected.',
  },
];

const INITIAL_FORM_STATE: LiveStatusFormState = {
  status: null,
  note: '',
};

function parseRouteParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function buildLiveStatusDraft(
  formState: LiveStatusFormState,
  bathroomId: string
): LiveStatusDraftShape | null {
  if (!formState.status) {
    return null;
  }

  return {
    bathroom_id: bathroomId,
    status: formState.status,
    note: formState.note.trim() || undefined,
  };
}

function hydrateFormStateFromDraft(draft: LiveStatusDraftShape): LiveStatusFormState {
  return {
    status: draft.status,
    note: draft.note ?? '',
  };
}

function buildReturnRoute(bathroomId: string, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: bathroomId,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.liveStatus}?${searchParams.toString()}`;
}

function formatBathroomAddress(bathroom: PublicBathroomDetailRow): string {
  return [bathroom.address_line1, bathroom.city, bathroom.state, bathroom.postal_code].filter(Boolean).join(', ');
}

export default function LiveStatusModalScreen() {
  const router = useRouter();
  const { bathroom_id, draft_id } = useLocalSearchParams<{
    bathroom_id?: string | string[];
    draft_id?: string | string[];
  }>();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [isLoadingBathroom, setIsLoadingBathroom] = useState(true);
  const [bathroomError, setBathroomError] = useState('');
  const [formState, setFormState] = useState<LiveStatusFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LiveStatusReportFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | null>(null);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);

  const bathroomId = useMemo(() => parseRouteParam(bathroom_id), [bathroom_id]);
  const requestedDraftId = useMemo(() => parseRouteParam(draft_id), [draft_id]);
  const {
    currentStatus,
    isLoadingCurrentStatus,
    isReportingStatus,
    reportStatus,
  } = useBathroomLiveStatus(bathroomId || null);
  const { hasAccepted: hasAcceptedTerms, acceptTerms } = useTermsAcceptance();

  const currentTone = useMemo(
    () => (currentStatus ? getBathroomStatusTone(currentStatus.status) : null),
    [currentStatus]
  );

  const closeModal = useCallback(() => {
    if (bathroomId) {
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
      return;
    }

    dismissToSafely(router, routes.tabs.map, routes.tabs.map);
  }, [bathroomId, router]);

  const updateNote = useCallback((value: string) => {
    setFormState((currentState) => ({
      ...currentState,
      note: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      note: undefined,
    }));
    setSubmitError('');
  }, []);

  const updateStatus = useCallback((value: BathroomLiveStatus) => {
    setFormState((currentState) => ({
      ...currentState,
      status: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      status: undefined,
    }));
    setSubmitError('');
  }, []);

  const deleteDraft = useCallback(
    async (draftIdToDelete: string | null) => {
      if (!user?.id || !draftIdToDelete) {
        return;
      }

      try {
        await liveStatusDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed live-status draft:', error);
      }
    },
    [user?.id]
  );

  const persistDraft = useCallback(
    async (announceSuccess: boolean): Promise<string | null> => {
      if (!user?.id || !bathroomId) {
        return null;
      }

      const draftPayload = buildLiveStatusDraft(formState, bathroomId);

      if (!draftPayload) {
        if (announceSuccess) {
          showToast({
            title: 'Choose a status first',
            message: 'Pick a live status before saving a draft.',
            variant: 'warning',
          });
        }
        return null;
      }

      setIsSavingDraft(true);

      try {
        const savedDraftId = await liveStatusDrafts.save(draftPayload, user.id, activeDraftId ?? undefined);

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your live status draft is stored on this device for this account.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this live-status draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save a live-status draft:', error);
        }

        return null;
      } finally {
        setIsSavingDraft(false);
      }
    },
    [activeDraftId, bathroomId, formState, showToast, user?.id]
  );

  const resetToFreshForm = useCallback(async () => {
    setIsResettingDraft(true);

    try {
      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      setRestoredDraftMessage(null);
      setFieldErrors({});
      setSubmitError('');
      setFormState(INITIAL_FORM_STATE);
    } catch (error) {
      showToast({
        title: 'Draft reset failed',
        message: getErrorMessage(error, 'Unable to clear this live-status draft right now.'),
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, deleteDraft, showToast]);

  const handleGuestSignIn = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'report_live_status',
        route: buildReturnRoute(bathroomId, requestedDraftId || null),
        params: {
          bathroom_id: bathroomId,
          draft_id: requestedDraftId || null,
        },
        replay_strategy: 'draft_resume',
      });
    }

    pushSafely(router, routes.auth.login, routes.auth.login);
  }, [bathroomId, requestedDraftId, requireAuth, router]);

  const loadBathroomDetail = useCallback(async () => {
    if (!bathroomId) {
      setBathroomError('We could not identify the bathroom you wanted to update.');
      setBathroomDetail(null);
      setIsLoadingBathroom(false);
      return;
    }

    setIsLoadingBathroom(true);
    setBathroomError('');

    try {
      const result = await fetchBathroomDetailById(bathroomId);

      if (result.error || !result.data) {
        const message = getErrorMessage(result.error, 'Unable to load this bathroom right now.');
        setBathroomDetail(null);
        setBathroomError(message);
        return;
      }

      setBathroomDetail(result.data);
    } catch (error) {
      setBathroomDetail(null);
      setBathroomError(getErrorMessage(error, 'Unable to load this bathroom right now.'));
    } finally {
      setIsLoadingBathroom(false);
    }
  }, [bathroomId]);

  useEffect(() => {
    void loadBathroomDetail();
  }, [loadBathroomDetail]);

  useEffect(() => {
    let isMounted = true;

    const hydrateDraft = async () => {
      if (!user?.id || !bathroomId) {
        if (isMounted) {
          setActiveDraftId(null);
          setRestoredDraftMessage(null);
          setIsHydratingDraft(false);
        }
        return;
      }

      setIsHydratingDraft(true);

      try {
        const availableDrafts = requestedDraftId ? [] : await liveStatusDrafts.list(user.id);
        const draft = requestedDraftId
          ? await liveStatusDrafts.get(requestedDraftId)
          : availableDrafts.find((candidateDraft) => candidateDraft.data.bathroom_id === bathroomId) ?? null;

        if (!isMounted) {
          return;
        }

        if (draft && draft.data.bathroom_id === bathroomId) {
          setFormState(hydrateFormStateFromDraft(draft.data));
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved live-status draft has been restored.'
              : 'Your latest live-status draft for this bathroom has been restored.'
          );
          return;
        }

        if (draft && draft.data.bathroom_id !== bathroomId) {
          showToast({
            title: 'Draft skipped',
            message: 'That saved draft belongs to a different bathroom and was not loaded here.',
            variant: 'warning',
          });
        }

        setFormState(INITIAL_FORM_STATE);
        setActiveDraftId(null);
        setRestoredDraftMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showToast({
          title: 'Draft unavailable',
          message: getErrorMessage(error, 'We could not restore your saved live-status draft right now.'),
          variant: 'warning',
        });
        setFormState(INITIAL_FORM_STATE);
      } finally {
        if (isMounted) {
          setIsHydratingDraft(false);
        }
      }
    };

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, [bathroomId, requestedDraftId, showToast, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!bathroomId || !user?.id || isReportingStatus) {
      return;
    }

    const validationResult = liveStatusReportSchema.safeParse({
      bathroom_id: bathroomId,
      status: formState.status,
      note: formState.note,
    });

    if (!validationResult.success) {
      const message = getErrorMessage(validationResult.error, 'Fix the highlighted fields and try again.');

      setFieldErrors(getFieldErrors(validationResult.error));
      setSubmitError(message);
      showToast({
        title: 'Check your entry',
        message,
        variant: 'warning',
      });
      return;
    }

    setFieldErrors({});
    setSubmitError('');

    try {
      const outcome = await reportStatus(validationResult.data.status, validationResult.data.note, {
        draftId: activeDraftId,
      });

      if (outcome === 'auth_required') {
        return;
      }

      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to save your live status update right now.'));
    }
  }, [
    activeDraftId,
    bathroomId,
    deleteDraft,
    formState.note,
    formState.status,
    isReportingStatus,
    reportStatus,
    router,
    showToast,
    user?.id,
  ]);

  if (isLoadingBathroom || isLoadingCurrentStatus || (Boolean(user?.id) && isHydratingDraft)) {
    return <LoadingScreen message="Preparing the live status flow for this bathroom." />;
  }

  if (!bathroomId || !bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black tracking-tight text-ink-900">Live status unavailable</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {bathroomError || 'We could not load the bathroom you wanted to update.'}
            </Text>
            <Button className="mt-6" label="Back To Map" onPress={closeModal} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 px-6 py-8">
          <View className="rounded-[30px] bg-ink-900 px-6 py-7">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Realtime Update</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to share live status.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Live status updates are tied to your account so cooldowns, trust, and moderation can stay consistent.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Selected Bathroom</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            <Button className="mt-6" label="Sign In To Share Status" onPress={handleGuestSignIn} />
            <Button className="mt-3" label="Cancel" onPress={closeModal} variant="secondary" />
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
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" className="flex-1">
          <View className="px-6 py-8">
            <View className="rounded-[30px] bg-brand-600 px-6 py-7">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Realtime Update</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Share the live status.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Tell the next person what it is like right now. Updates stay visible for two hours and refresh the live status banner instantly.
              </Text>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            </View>

            {currentStatus ? (
              <View
                className={[
                  'mt-6 rounded-[30px] border px-5 py-5',
                  currentTone ? `${currentTone.backgroundClassName} ${currentTone.borderClassName}` : 'border-surface-strong bg-surface-card',
                ].join(' ')}
              >
                <Text className={['text-sm font-semibold uppercase tracking-[1px]', currentTone?.textClassName ?? 'text-ink-700'].join(' ')}>
                  Current community status
                </Text>
                <Text className={['mt-3 text-2xl font-black', currentTone?.textClassName ?? 'text-ink-900'].join(' ')}>
                  {getBathroomStatusEmoji(currentStatus.status)} {getBathroomStatusLabel(currentStatus.status)}
                </Text>
                <Text className="mt-2 text-sm leading-5 text-ink-700">
                  {formatBathroomStatusTimestamp(currentStatus.created_at)}
                </Text>
                {currentStatus.note ? (
                  <Text className="mt-2 text-sm leading-5 text-ink-700">{currentStatus.note}</Text>
                ) : null}
              </View>
            ) : null}

            {restoredDraftMessage ? (
              <View className="mt-6 rounded-2xl bg-brand-600/10 px-4 py-4">
                <Text className="text-sm font-medium text-brand-700">{restoredDraftMessage}</Text>
              </View>
            ) : null}

            {submitError ? (
              <View className="mt-6 rounded-2xl bg-danger/10 px-4 py-4">
                <Text className="text-sm font-medium text-danger">{submitError}</Text>
              </View>
            ) : null}

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Choose a status</Text>
              <View className="mt-4 gap-3">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = formState.status === option.status;
                  const optionTone = getBathroomStatusTone(option.status);

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className={[
                        'rounded-2xl border px-4 py-4',
                        isSelected
                          ? `${optionTone.backgroundClassName} ${optionTone.borderClassName}`
                          : 'border-surface-strong bg-surface-base',
                      ].join(' ')}
                      key={option.status}
                      onPress={() => updateStatus(option.status)}
                    >
                      <Text className={['text-base font-bold', isSelected ? optionTone.textClassName : 'text-ink-900'].join(' ')}>
                        {getBathroomStatusEmoji(option.status)} {option.label}
                      </Text>
                      <Text className={['mt-1 text-sm', isSelected ? optionTone.textClassName : 'text-ink-600'].join(' ')}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.status ? <Text className="mt-3 text-sm text-danger">{fieldErrors.status}</Text> : null}
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Input
                autoCapitalize="sentences"
                helperText="Optional context like line length, supplies, or why it was unavailable. Keep it under 280 characters."
                inputClassName="min-h-[110px]"
                label="Status note (optional)"
                maxLength={280}
                multiline
                numberOfLines={4}
                onChangeText={updateNote}
                placeholder="Line to the hallway, clean stalls, locked for customers only, etc."
                textAlignVertical="top"
                value={formState.note}
                error={fieldErrors.note}
              />
            </View>

            <TermsGate
              hasAccepted={hasAcceptedTerms}
              onAccept={() => void acceptTerms()}
              fallbackRoute="/modal/live-status"
            />

            <View className="mt-6 gap-3">
              <Button
                disabled={hasAcceptedTerms === false}
                label="Share Live Status"
                loading={isReportingStatus}
                onPress={() => {
                  void handleSubmit();
                }}
              />
              <Button
                label="Save Draft"
                loading={isSavingDraft}
                onPress={() => {
                  void persistDraft(true);
                }}
                variant="secondary"
              />
              <Button
                label="Reset Draft"
                loading={isResettingDraft}
                onPress={() => {
                  void resetToFreshForm();
                }}
                variant="ghost"
              />
              <Button label="Cancel" onPress={closeModal} variant="ghost" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
