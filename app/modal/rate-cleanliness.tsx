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
import { useCleanlinessRating } from '@/hooks/useCleanlinessRating';
import { useToast } from '@/hooks/useToast';
import { cleanlinessRatingDrafts } from '@/lib/draft-manager';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import { TermsGate } from '@/components/TermsGate';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { getErrorMessage } from '@/utils/errorMap';
import {
  cleanlinessRatingSchema,
  CleanlinessRatingFormValues,
  FieldErrors,
  getFieldErrors,
} from '@/utils/validate';

interface CleanlinessRatingFormState {
  rating: number | null;
  notes: string;
}

interface CleanlinessRatingDraftShape {
  bathroom_id: string;
  rating: number;
  notes?: string;
}

const RATING_OPTIONS = [
  { value: 1, label: '1', description: 'Very dirty' },
  { value: 2, label: '2', description: 'Needs work' },
  { value: 3, label: '3', description: 'Usable' },
  { value: 4, label: '4', description: 'Clean' },
  { value: 5, label: '5', description: 'Spotless' },
] as const;

const INITIAL_FORM_STATE: CleanlinessRatingFormState = {
  rating: null,
  notes: '',
};

function parseRouteParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function buildRatingDraft(
  formState: CleanlinessRatingFormState,
  bathroomId: string
): CleanlinessRatingDraftShape | null {
  if (formState.rating === null) {
    return null;
  }

  return {
    bathroom_id: bathroomId,
    rating: formState.rating,
    notes: formState.notes.trim() || undefined,
  };
}

function hydrateFormStateFromDraft(draft: CleanlinessRatingDraftShape): CleanlinessRatingFormState {
  return {
    rating: draft.rating,
    notes: draft.notes ?? '',
  };
}

function buildReturnRoute(bathroomId: string, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: bathroomId,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.rateCleanliness}?${searchParams.toString()}`;
}

function formatBathroomAddress(bathroom: PublicBathroomDetailRow): string {
  return [bathroom.address_line1, bathroom.city, bathroom.state, bathroom.postal_code].filter(Boolean).join(', ');
}

export default function RateCleanlinessModalScreen() {
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
  const [formState, setFormState] = useState<CleanlinessRatingFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CleanlinessRatingFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | null>(null);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);

  const bathroomId = useMemo(() => parseRouteParam(bathroom_id), [bathroom_id]);
  const requestedDraftId = useMemo(() => parseRouteParam(draft_id), [draft_id]);
  const { currentRating, isLoadingCurrentRating, isSubmitting, submitRating } = useCleanlinessRating(bathroomId || null);
  const { hasAccepted: hasAcceptedTerms, acceptTerms } = useTermsAcceptance();

  const closeModal = useCallback(() => {
    if (bathroomId) {
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
      return;
    }

    dismissToSafely(router, routes.tabs.map, routes.tabs.map);
  }, [bathroomId, router]);

  const updateNotes = useCallback((value: string) => {
    setFormState((currentState) => ({
      ...currentState,
      notes: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      notes: undefined,
    }));
    setSubmitError('');
  }, []);

  const updateRating = useCallback((value: number) => {
    setFormState((currentState) => ({
      ...currentState,
      rating: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      rating: undefined,
    }));
    setSubmitError('');
  }, []);

  const deleteDraft = useCallback(
    async (draftIdToDelete: string | null) => {
      if (!user?.id || !draftIdToDelete) {
        return;
      }

      try {
        await cleanlinessRatingDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed cleanliness-rating draft:', error);
      }
    },
    [user?.id]
  );

  const persistDraft = useCallback(
    async (announceSuccess: boolean): Promise<string | null> => {
      if (!user?.id || !bathroomId) {
        return null;
      }

      const draftPayload = buildRatingDraft(formState, bathroomId);

      if (!draftPayload) {
        if (announceSuccess) {
          showToast({
            title: 'Choose a rating first',
            message: 'Pick a cleanliness rating before saving a draft.',
            variant: 'warning',
          });
        }
        return null;
      }

      setIsSavingDraft(true);

      try {
        const savedDraftId = await cleanlinessRatingDrafts.save(draftPayload, user.id, activeDraftId ?? undefined);

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your cleanliness rating draft is stored on this device for this account.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this cleanliness draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save a cleanliness-rating draft:', error);
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
      setFormState({
        rating: currentRating?.rating ?? null,
        notes: currentRating?.notes ?? '',
      });
    } catch (error) {
      showToast({
        title: 'Draft reset failed',
        message: getErrorMessage(error, 'Unable to clear this cleanliness draft right now.'),
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, currentRating?.notes, currentRating?.rating, deleteDraft, showToast]);

  const handleGuestSignIn = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'rate_cleanliness',
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
      setBathroomError('We could not identify the bathroom you wanted to rate.');
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
    if (currentRating) {
      setFormState((currentState) => {
        if (currentState.rating !== null || currentState.notes.trim().length > 0 || restoredDraftMessage) {
          return currentState;
        }

        return {
          rating: currentRating.rating,
          notes: currentRating.notes ?? '',
        };
      });
    }
  }, [currentRating, restoredDraftMessage]);

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
        const availableDrafts = requestedDraftId ? [] : await cleanlinessRatingDrafts.list(user.id);
        const draft = requestedDraftId
          ? await cleanlinessRatingDrafts.get(requestedDraftId)
          : availableDrafts.find((candidateDraft) => candidateDraft.data.bathroom_id === bathroomId) ?? null;

        if (!isMounted) {
          return;
        }

        if (draft && draft.data.bathroom_id === bathroomId) {
          setFormState(hydrateFormStateFromDraft(draft.data));
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved cleanliness draft has been restored.'
              : 'Your latest cleanliness draft for this bathroom has been restored.'
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

        setFormState({
          rating: currentRating?.rating ?? null,
          notes: currentRating?.notes ?? '',
        });
        setActiveDraftId(null);
        setRestoredDraftMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showToast({
          title: 'Draft unavailable',
          message: getErrorMessage(error, 'We could not restore your saved cleanliness draft right now.'),
          variant: 'warning',
        });
        setFormState({
          rating: currentRating?.rating ?? null,
          notes: currentRating?.notes ?? '',
        });
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
  }, [bathroomId, currentRating?.notes, currentRating?.rating, requestedDraftId, showToast, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!bathroomId || !user?.id || isSubmitting) {
      return;
    }

    const validationResult = cleanlinessRatingSchema.safeParse({
      bathroom_id: bathroomId,
      rating: formState.rating,
      notes: formState.notes,
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
      const outcome = await submitRating(validationResult.data, {
        draftId: activeDraftId,
      });

      if (outcome === 'auth_required') {
        return;
      }

      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to save your cleanliness rating right now.'));
    }
  }, [activeDraftId, bathroomId, deleteDraft, formState.notes, formState.rating, isSubmitting, router, showToast, submitRating, user?.id]);

  if (isLoadingBathroom || isLoadingCurrentRating || (Boolean(user?.id) && isHydratingDraft)) {
    return <LoadingScreen message="Preparing the cleanliness rating flow for this bathroom." />;
  }

  if (!bathroomId || !bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black tracking-tight text-ink-900">Cleanliness rating unavailable</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {bathroomError || 'We could not load the bathroom you wanted to rate.'}
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
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Bathroom Condition</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to rate cleanliness.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Cleanliness ratings are tied to your account so the community can trust each update and your points can be tracked correctly.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Selected Bathroom</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            <Button className="mt-6" label="Sign In To Rate" onPress={handleGuestSignIn} />
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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Bathroom Condition</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Rate cleanliness.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Share how clean the bathroom was when you arrived. Your rating updates the community signal used across the map and search results.
              </Text>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
              <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Current community average</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {typeof bathroomDetail.cleanliness_avg === 'number'
                    ? `${bathroomDetail.cleanliness_avg.toFixed(1)} / 5`
                    : 'No cleanliness ratings yet'}
                </Text>
                {currentRating ? (
                  <Text className="mt-2 text-sm leading-5 text-brand-700">
                    Your current rating: {currentRating.rating} / 5
                  </Text>
                ) : null}
              </View>
            </View>

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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Your Rating</Text>
              <View className="mt-4 gap-3">
                {RATING_OPTIONS.map((option) => {
                  const isSelected = formState.rating === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className={[
                        'rounded-2xl border px-4 py-4',
                        isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                      ].join(' ')}
                      key={option.value}
                      onPress={() => updateRating(option.value)}
                    >
                      <Text className={['text-base font-bold', isSelected ? 'text-brand-700' : 'text-ink-900'].join(' ')}>
                        {'★'.repeat(option.value)}{'☆'.repeat(5 - option.value)} {option.label} / 5
                      </Text>
                      <Text className={['mt-1 text-sm', isSelected ? 'text-brand-700' : 'text-ink-600'].join(' ')}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.rating ? <Text className="mt-3 text-sm text-danger">{fieldErrors.rating}</Text> : null}
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Input
                autoCapitalize="sentences"
                helperText="Optional context like smell, supplies, or overall condition. Keep it under 300 characters."
                inputClassName="min-h-[110px]"
                label="Notes (optional)"
                maxLength={300}
                multiline
                numberOfLines={4}
                onChangeText={updateNotes}
                placeholder="Clean stalls, no soap, long line, etc."
                textAlignVertical="top"
                value={formState.notes}
                error={fieldErrors.notes}
              />
            </View>

            <TermsGate
              hasAccepted={hasAcceptedTerms}
              onAccept={() => void acceptTerms()}
              fallbackRoute="/modal/rate-cleanliness"
            />

            <View className="mt-6 gap-3">
              <Button
                disabled={hasAcceptedTerms === false}
                label="Save Rating"
                loading={isSubmitting}
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
