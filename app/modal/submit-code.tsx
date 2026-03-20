import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchBathroomDetailById, PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomCodeSubmission } from '@/hooks/useBathroomCodeSubmission';
import { useToast } from '@/hooks/useToast';
import { submitCodeDrafts } from '@/lib/draft-manager';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';
import { codeSubmitSchema, CodeSubmitFormValues, FieldErrors, getFieldErrors } from '@/utils/validate';

interface SubmitCodeFormState {
  code_value: string;
}

interface SubmitCodeDraftShape {
  bathroom_id: string;
  code_value: string;
}

const INITIAL_FORM_STATE: SubmitCodeFormState = {
  code_value: '',
};

function parseRouteParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function buildSubmitCodeDraft(formState: SubmitCodeFormState, bathroomId: string): SubmitCodeDraftShape {
  return {
    bathroom_id: bathroomId,
    code_value: formState.code_value.trim(),
  };
}

function hydrateFormStateFromDraft(draft: SubmitCodeDraftShape): SubmitCodeFormState {
  return {
    code_value: draft.code_value ?? '',
  };
}

function buildReturnRoute(bathroomId: string, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: bathroomId,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.submitCode}?${searchParams.toString()}`;
}

function formatBathroomAddress(bathroom: PublicBathroomDetailRow): string {
  return [bathroom.address_line1, bathroom.city, bathroom.state, bathroom.postal_code].filter(Boolean).join(', ');
}

export default function SubmitCodeModalScreen() {
  const router = useRouter();
  const { bathroom_id, draft_id } = useLocalSearchParams<{
    bathroom_id?: string | string[];
    draft_id?: string | string[];
  }>();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const { isSubmitting, submitCode } = useBathroomCodeSubmission();
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [isLoadingBathroom, setIsLoadingBathroom] = useState(true);
  const [bathroomError, setBathroomError] = useState('');
  const [formState, setFormState] = useState<SubmitCodeFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CodeSubmitFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | null>(null);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);

  const bathroomId = useMemo(() => parseRouteParam(bathroom_id), [bathroom_id]);
  const requestedDraftId = useMemo(() => parseRouteParam(draft_id), [draft_id]);

  const closeModal = useCallback(() => {
    if (bathroomId) {
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
      return;
    }

    dismissToSafely(router, routes.tabs.map, routes.tabs.map);
  }, [bathroomId, router]);

  const updateField = useCallback((field: keyof SubmitCodeFormState, value: string) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setSubmitError('');
  }, []);

  const deleteDraft = useCallback(
    async (draftIdToDelete: string | null) => {
      if (!user?.id || !draftIdToDelete) {
        return;
      }

      try {
        await submitCodeDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed code-submission draft:', error);
      }
    },
    [user?.id]
  );

  const persistDraft = useCallback(
    async (announceSuccess: boolean): Promise<string | null> => {
      if (!user?.id || !bathroomId) {
        return null;
      }

      setIsSavingDraft(true);

      try {
        const savedDraftId = await submitCodeDrafts.save(
          buildSubmitCodeDraft(formState, bathroomId),
          user.id,
          activeDraftId ?? undefined
        );

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your access code draft is stored on this device for this account.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this access code draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save a code-submission draft:', error);
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
        message: getErrorMessage(error, 'Unable to clear this access code draft right now.'),
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, deleteDraft, showToast]);

  const handleGuestSignIn = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'submit_code',
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
        const availableDrafts = requestedDraftId ? [] : await submitCodeDrafts.list(user.id);
        const draft = requestedDraftId
          ? await submitCodeDrafts.get(requestedDraftId)
          : availableDrafts.find((candidateDraft) => candidateDraft.data.bathroom_id === bathroomId) ?? null;

        if (!isMounted) {
          return;
        }

        if (draft && draft.data.bathroom_id === bathroomId) {
          setFormState(hydrateFormStateFromDraft(draft.data));
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved access code draft has been restored.'
              : 'Your latest draft for this bathroom has been restored.'
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
          message: getErrorMessage(error, 'We could not restore your saved access code draft right now.'),
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
    if (!bathroomId || !user?.id || isSubmitting) {
      return;
    }

    const validationResult = codeSubmitSchema.safeParse({
      bathroom_id: bathroomId,
      code_value: formState.code_value,
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
      const outcome = await submitCode(validationResult.data, {
        draftId: activeDraftId,
      });

      if (outcome.status === 'auth_required') {
        return;
      }

      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to submit this access code right now.'));
    }
  }, [activeDraftId, bathroomId, deleteDraft, formState.code_value, isSubmitting, router, showToast, submitCode, user?.id]);

  if (isLoadingBathroom || (Boolean(user?.id) && isHydratingDraft)) {
    return <LoadingScreen message="Preparing the code submission flow for this bathroom." />;
  }

  if (!bathroomId || !bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black tracking-tight text-ink-900">Code submission unavailable</Text>
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
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Community Code Update</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to submit a code.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Code submissions are tied to your account so the trust engine can track verification, confidence, and points.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Selected Bathroom</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            <Button className="mt-6" label="Sign In To Submit Code" onPress={handleGuestSignIn} />
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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Community Code Update</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Submit the latest code.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Share the code that worked for you most recently. Community verification will adjust confidence over time.
              </Text>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
              <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Current trust pulse</Text>
                <Text className="mt-1 text-sm leading-5 text-ink-600">
                  {bathroomDetail.code_id
                    ? `Existing community code confidence: ${Math.round(bathroomDetail.confidence_score ?? 0)}%.`
                    : 'No community code has been submitted for this bathroom yet.'}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-600">
                  Submitting a newer code does not overwrite trust instantly. Verification votes will determine which code proves reliable.
                </Text>
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
              <Input
                autoCapitalize="characters"
                autoCorrect={false}
                helperText="Use the exact keypad or staff-provided code. Letters, numbers, spaces, #, *, dash, and underscore are allowed."
                label="Access Code"
                onChangeText={(value) => updateField('code_value', value)}
                placeholder="1234#"
                returnKeyType="done"
                value={formState.code_value}
                error={fieldErrors.code_value}
              />
            </View>

            <View className="mt-6 gap-3">
              <Button
                label="Submit Code"
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
