import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { z } from 'zod';
import { fetchBathroomDetailById, PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AccessibilitySummaryCard } from '@/components/accessibility/AccessibilitySummaryCard';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomAccessibilitySubmission } from '@/hooks/useBathroomAccessibilitySubmission';
import { useToast } from '@/hooks/useToast';
import { accessibilityUpdateDrafts } from '@/lib/draft-manager';
import { updateBathroomAccessibilitySchema } from '@/lib/validators';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import type { BathroomAccessibilityUpdateInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { FieldErrors, getFieldErrors } from '@/utils/validate';

type AccessibilityUpdateFormValues = z.infer<typeof updateBathroomAccessibilitySchema>;

interface AccessibilityFeatureOption {
  key:
    | 'has_grab_bars'
    | 'is_automatic_door'
    | 'has_wheelchair_ramp'
    | 'has_elevator_access'
    | 'has_changing_table'
    | 'is_family_restroom'
    | 'is_gender_neutral'
    | 'has_audio_cue'
    | 'has_braille_signage';
  label: string;
  description: string;
}

interface AccessibilityFormState {
  has_grab_bars: boolean;
  is_automatic_door: boolean;
  has_wheelchair_ramp: boolean;
  has_elevator_access: boolean;
  has_changing_table: boolean;
  is_family_restroom: boolean;
  is_gender_neutral: boolean;
  has_audio_cue: boolean;
  has_braille_signage: boolean;
  door_width_inches: string;
  stall_width_inches: string;
  turning_radius_inches: string;
  notes: string;
}

const FEATURE_OPTIONS: AccessibilityFeatureOption[] = [
  {
    key: 'has_grab_bars',
    label: 'Grab bars',
    description: 'Safety bars were installed and usable in the stall.',
  },
  {
    key: 'is_automatic_door',
    label: 'Automatic door',
    description: 'Door opened automatically or had an accessible opener.',
  },
  {
    key: 'has_wheelchair_ramp',
    label: 'Wheelchair ramp',
    description: 'There was a ramp or step-free approach to the restroom.',
  },
  {
    key: 'has_elevator_access',
    label: 'Elevator access',
    description: 'An elevator provided accessible access to the restroom level.',
  },
  {
    key: 'has_changing_table',
    label: 'Changing table',
    description: 'A baby changing table was available inside or directly adjacent.',
  },
  {
    key: 'is_family_restroom',
    label: 'Family restroom',
    description: 'Single-stall or family-style restroom with extra space.',
  },
  {
    key: 'is_gender_neutral',
    label: 'Gender neutral',
    description: 'Restroom signage or access was explicitly gender neutral.',
  },
  {
    key: 'has_audio_cue',
    label: 'Audio cue',
    description: 'Audio prompts or audible guidance were present.',
  },
  {
    key: 'has_braille_signage',
    label: 'Braille signage',
    description: 'Braille restroom signage was visible and readable.',
  },
];

const EMPTY_FORM_STATE: AccessibilityFormState = {
  has_grab_bars: false,
  is_automatic_door: false,
  has_wheelchair_ramp: false,
  has_elevator_access: false,
  has_changing_table: false,
  is_family_restroom: false,
  is_gender_neutral: false,
  has_audio_cue: false,
  has_braille_signage: false,
  door_width_inches: '',
  stall_width_inches: '',
  turning_radius_inches: '',
  notes: '',
};

function parseRouteParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function formatOptionalDimension(value: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return `${value}`;
}

function buildInitialAccessibilityFormState(
  bathroom: PublicBathroomDetailRow | null
): AccessibilityFormState {
  if (!bathroom) {
    return EMPTY_FORM_STATE;
  }

  const features = bathroom.accessibility_features;

  return {
    has_grab_bars: features.has_grab_bars,
    is_automatic_door: features.is_automatic_door,
    has_wheelchair_ramp: features.has_wheelchair_ramp,
    has_elevator_access: features.has_elevator_access,
    has_changing_table: features.has_changing_table,
    is_family_restroom: features.is_family_restroom,
    is_gender_neutral: features.is_gender_neutral,
    has_audio_cue: features.has_audio_cue,
    has_braille_signage: features.has_braille_signage,
    door_width_inches: formatOptionalDimension(features.door_width_inches),
    stall_width_inches: formatOptionalDimension(features.stall_width_inches),
    turning_radius_inches: formatOptionalDimension(features.turning_radius_inches),
    notes: features.notes ?? '',
  };
}

function buildAccessibilityDraft(
  formState: AccessibilityFormState,
  bathroomId: string
): BathroomAccessibilityUpdateInput | null {
  const payload: BathroomAccessibilityUpdateInput = {
    bathroom_id: bathroomId,
  };

  FEATURE_OPTIONS.forEach((option) => {
    if (formState[option.key]) {
      payload[option.key] = true;
    }
  });

  const doorWidth = Number.parseInt(formState.door_width_inches.trim(), 10);
  const stallWidth = Number.parseInt(formState.stall_width_inches.trim(), 10);
  const turningRadius = Number.parseInt(formState.turning_radius_inches.trim(), 10);

  if (Number.isFinite(doorWidth)) {
    payload.door_width_inches = doorWidth;
  }

  if (Number.isFinite(stallWidth)) {
    payload.stall_width_inches = stallWidth;
  }

  if (Number.isFinite(turningRadius)) {
    payload.turning_radius_inches = turningRadius;
  }

  if (formState.notes.trim()) {
    payload.notes = formState.notes.trim();
  }

  return Object.keys(payload).length > 1 ? payload : null;
}

function hydrateFormStateFromDraft(draft: BathroomAccessibilityUpdateInput): AccessibilityFormState {
  return {
    has_grab_bars: Boolean(draft.has_grab_bars),
    is_automatic_door: Boolean(draft.is_automatic_door),
    has_wheelchair_ramp: Boolean(draft.has_wheelchair_ramp),
    has_elevator_access: Boolean(draft.has_elevator_access),
    has_changing_table: Boolean(draft.has_changing_table),
    is_family_restroom: Boolean(draft.is_family_restroom),
    is_gender_neutral: Boolean(draft.is_gender_neutral),
    has_audio_cue: Boolean(draft.has_audio_cue),
    has_braille_signage: Boolean(draft.has_braille_signage),
    door_width_inches: formatOptionalDimension(draft.door_width_inches ?? null),
    stall_width_inches: formatOptionalDimension(draft.stall_width_inches ?? null),
    turning_radius_inches: formatOptionalDimension(draft.turning_radius_inches ?? null),
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

  return `${routes.modal.updateAccessibility}?${searchParams.toString()}`;
}

function formatBathroomAddress(bathroom: PublicBathroomDetailRow): string {
  return [bathroom.address_line1, bathroom.city, bathroom.state, bathroom.postal_code].filter(Boolean).join(', ');
}

export default function UpdateAccessibilityModalScreen() {
  const router = useRouter();
  const { bathroom_id, draft_id } = useLocalSearchParams<{
    bathroom_id?: string | string[];
    draft_id?: string | string[];
  }>();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const { isSubmitting, submitAccessibility } = useBathroomAccessibilitySubmission();
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [isLoadingBathroom, setIsLoadingBathroom] = useState(true);
  const [bathroomError, setBathroomError] = useState('');
  const [formState, setFormState] = useState<AccessibilityFormState>(EMPTY_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<AccessibilityUpdateFormValues>>({});
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

  const updateToggle = useCallback((field: AccessibilityFeatureOption['key']) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: !currentState[field],
    }));
    setSubmitError('');
  }, []);

  const updateField = useCallback(
    (
      field: 'door_width_inches' | 'stall_width_inches' | 'turning_radius_inches' | 'notes',
      value: string
    ) => {
      setFormState((currentState) => ({
        ...currentState,
        [field]: value,
      }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
      setSubmitError('');
    },
    []
  );

  const deleteDraft = useCallback(
    async (draftIdToDelete: string | null) => {
      if (!user?.id || !draftIdToDelete) {
        return;
      }

      try {
        await accessibilityUpdateDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed accessibility draft:', error);
      }
    },
    [user?.id]
  );

  const persistDraft = useCallback(
    async (announceSuccess: boolean): Promise<string | null> => {
      if (!user?.id || !bathroomId) {
        return null;
      }

      const draftPayload = buildAccessibilityDraft(formState, bathroomId);

      if (!draftPayload) {
        if (announceSuccess) {
          showToast({
            title: 'Add a detail first',
            message: 'Select at least one accessibility feature, measurement, or note before saving a draft.',
            variant: 'warning',
          });
        }
        return null;
      }

      setIsSavingDraft(true);

      try {
        const savedDraftId = await accessibilityUpdateDrafts.save(draftPayload, user.id, activeDraftId ?? undefined);

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your accessibility draft is stored on this device for this account.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this accessibility draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save an accessibility draft:', error);
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
      setFormState(buildInitialAccessibilityFormState(bathroomDetail));
    } catch (error) {
      showToast({
        title: 'Draft reset failed',
        message: getErrorMessage(error, 'Unable to clear this accessibility draft right now.'),
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, bathroomDetail, deleteDraft, showToast]);

  const handleGuestSignIn = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'update_accessibility',
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
      setFormState((currentState) => {
        const hasUserInput = Object.values(currentState).some((value) =>
          typeof value === 'boolean' ? value : value.trim().length > 0
        );

        return hasUserInput ? currentState : buildInitialAccessibilityFormState(result.data);
      });
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
        const availableDrafts = requestedDraftId ? [] : await accessibilityUpdateDrafts.list(user.id);
        const draft = requestedDraftId
          ? await accessibilityUpdateDrafts.get(requestedDraftId)
          : availableDrafts.find((candidateDraft) => candidateDraft.data.bathroom_id === bathroomId) ?? null;

        if (!isMounted) {
          return;
        }

        if (draft && draft.data.bathroom_id === bathroomId) {
          setFormState(hydrateFormStateFromDraft(draft.data));
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved accessibility draft has been restored.'
              : 'Your latest accessibility draft for this bathroom has been restored.'
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

        setFormState(buildInitialAccessibilityFormState(bathroomDetail));
        setActiveDraftId(null);
        setRestoredDraftMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showToast({
          title: 'Draft unavailable',
          message: getErrorMessage(error, 'We could not restore your saved accessibility draft right now.'),
          variant: 'warning',
        });
        setFormState(buildInitialAccessibilityFormState(bathroomDetail));
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
  }, [bathroomDetail, bathroomId, requestedDraftId, showToast, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!bathroomId || !user?.id || isSubmitting) {
      return;
    }

    const draftPayload = buildAccessibilityDraft(formState, bathroomId);

    if (!draftPayload) {
      setSubmitError('Add at least one accessibility detail before saving.');
      showToast({
        title: 'Add a detail first',
        message: 'Select at least one accessibility feature, measurement, or note before saving.',
        variant: 'warning',
      });
      return;
    }

    const validationResult = updateBathroomAccessibilitySchema.safeParse(draftPayload);

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
      const outcome = await submitAccessibility(validationResult.data, {
        draftId: activeDraftId,
      });

      if (outcome === 'auth_required') {
        return;
      }

      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.map);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to save accessibility details right now.'));
    }
  }, [activeDraftId, bathroomId, deleteDraft, formState, isSubmitting, router, showToast, submitAccessibility, user?.id]);

  if (isLoadingBathroom || (Boolean(user?.id) && isHydratingDraft)) {
    return <LoadingScreen message="Preparing the accessibility update flow for this bathroom." />;
  }

  if (!bathroomId || !bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black tracking-tight text-ink-900">Accessibility update unavailable</Text>
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
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Accessibility Details</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to add accessibility details.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Accessibility updates are tied to your account so the community can trust each contribution and build better filters over time.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Selected Bathroom</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            <Button className="mt-6" label="Sign In To Contribute" onPress={handleGuestSignIn} />
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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Accessibility Details</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Report what you verified.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Add structured accessibility details you personally confirmed on site. Only select features you are confident were present.
              </Text>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">{formatBathroomAddress(bathroomDetail)}</Text>
            </View>

            <View className="mt-6">
              <AccessibilitySummaryCard
                accessibilityFeatures={bathroomDetail.accessibility_features}
                accessibilityScore={bathroomDetail.accessibility_score ?? 0}
                isAccessible={bathroomDetail.is_accessible}
                title="Current community signal"
              />
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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Verified features</Text>
              <View className="mt-4 gap-3">
                {FEATURE_OPTIONS.map((option) => {
                  const isSelected = formState[option.key];

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className={[
                        'rounded-2xl border px-4 py-4',
                        isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                      ].join(' ')}
                      key={option.key}
                      onPress={() => updateToggle(option.key)}
                    >
                      <Text className={['text-base font-bold', isSelected ? 'text-brand-700' : 'text-ink-900'].join(' ')}>
                        {option.label}
                      </Text>
                      <Text className={['mt-1 text-sm', isSelected ? 'text-brand-700' : 'text-ink-600'].join(' ')}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Measured dimensions</Text>
              <View className="mt-4 gap-4">
                <Input
                  keyboardType="number-pad"
                  label='Door width (inches, optional)'
                  onChangeText={(value) => updateField('door_width_inches', value)}
                  placeholder='32'
                  value={formState.door_width_inches}
                  error={fieldErrors.door_width_inches}
                />
                <Input
                  keyboardType="number-pad"
                  label='Stall width (inches, optional)'
                  onChangeText={(value) => updateField('stall_width_inches', value)}
                  placeholder='60'
                  value={formState.stall_width_inches}
                  error={fieldErrors.stall_width_inches}
                />
                <Input
                  keyboardType="number-pad"
                  label='Turning radius (inches, optional)'
                  onChangeText={(value) => updateField('turning_radius_inches', value)}
                  placeholder='60'
                  value={formState.turning_radius_inches}
                  error={fieldErrors.turning_radius_inches}
                />
              </View>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Input
                autoCapitalize="sentences"
                helperText="Optional context like stall layout, approach path, or anything people should know. Keep it under 500 characters."
                inputClassName="min-h-[110px]"
                label="Notes (optional)"
                maxLength={500}
                multiline
                numberOfLines={4}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Wide hallway, automatic opener near the entrance, family stall by the lobby, etc."
                textAlignVertical="top"
                value={formState.notes}
                error={fieldErrors.notes}
              />
            </View>

            <View className="mt-6 gap-3">
              <Button
                label="Save Accessibility Details"
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
