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
import { useBusinessClaimSubmission } from '@/hooks/useBusinessClaimSubmission';
import { useToast } from '@/hooks/useToast';
import { claimBusinessDrafts } from '@/lib/draft-manager';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import { ClaimBusinessDraft } from '@/types';
import { formatBusinessClaimAddress } from '@/utils/business-claims';
import { TermsGate } from '@/components/TermsGate';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { getErrorMessage } from '@/utils/errorMap';
import {
  claimBusinessSchema,
  ClaimBusinessFormValues,
  FieldErrors,
  getFieldErrors,
} from '@/utils/validate';

interface ClaimBusinessFormState {
  business_name: string;
  contact_email: string;
  contact_phone: string;
  evidence_url: string;
}

function parseRouteParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function createInitialFormState(contactEmail?: string | null): ClaimBusinessFormState {
  return {
    business_name: '',
    contact_email: contactEmail?.trim() ?? '',
    contact_phone: '',
    evidence_url: '',
  };
}

function buildClaimDraft(formState: ClaimBusinessFormState, bathroomId: string): ClaimBusinessDraft {
  return {
    bathroom_id: bathroomId,
    business_name: formState.business_name.trim(),
    contact_email: formState.contact_email.trim(),
    contact_phone: formState.contact_phone.trim() || undefined,
    evidence_url: formState.evidence_url.trim() || undefined,
  };
}

function hydrateFormStateFromDraft(
  draft: ClaimBusinessDraft,
  fallbackContactEmail?: string | null
): ClaimBusinessFormState {
  return {
    business_name: draft.business_name ?? '',
    contact_email: draft.contact_email ?? fallbackContactEmail?.trim() ?? '',
    contact_phone: draft.contact_phone ?? '',
    evidence_url: draft.evidence_url ?? '',
  };
}

function buildReturnRoute(bathroomId: string, draftId?: string | null): string {
  const searchParams = new URLSearchParams({
    bathroom_id: bathroomId,
  });

  if (draftId) {
    searchParams.set('draft_id', draftId);
  }

  return `${routes.modal.claimBusiness}?${searchParams.toString()}`;
}

export default function ClaimBusinessModalScreen() {
  const router = useRouter();
  const { bathroom_id, draft_id } = useLocalSearchParams<{
    bathroom_id?: string | string[];
    draft_id?: string | string[];
  }>();
  const { requireAuth, user } = useAuth();
  const { showToast } = useToast();
  const { isSubmitting, submitClaim } = useBusinessClaimSubmission();
  const { hasAccepted: hasAcceptedTerms, acceptTerms } = useTermsAcceptance();
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [isLoadingBathroom, setIsLoadingBathroom] = useState(true);
  const [bathroomError, setBathroomError] = useState('');
  const [formState, setFormState] = useState<ClaimBusinessFormState>(createInitialFormState());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ClaimBusinessFormValues>>({});
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
      dismissToSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.business);
      return;
    }

    dismissToSafely(router, routes.tabs.business, routes.tabs.map);
  }, [bathroomId, router]);

  const updateField = useCallback(
    (field: keyof ClaimBusinessFormState, value: string) => {
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
        await claimBusinessDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed business-claim draft:', error);
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
        const savedDraftId = await claimBusinessDrafts.save(
          buildClaimDraft(formState, bathroomId),
          user.id,
          activeDraftId ?? undefined
        );

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your business claim draft is stored on this device for this account.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this business claim draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save a business-claim draft:', error);
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
      setFormState(createInitialFormState(user?.email));
    } catch (error) {
      showToast({
        title: 'Draft reset failed',
        message: getErrorMessage(error, 'Unable to clear this business claim draft right now.'),
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, deleteDraft, showToast, user?.email]);

  const handleGuestSignIn = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'claim_business',
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

  const handleGuestRegister = useCallback(() => {
    if (bathroomId) {
      requireAuth({
        type: 'claim_business',
        route: buildReturnRoute(bathroomId, requestedDraftId || null),
        params: {
          bathroom_id: bathroomId,
          draft_id: requestedDraftId || null,
        },
        replay_strategy: 'draft_resume',
      });
    }

    pushSafely(router, routes.auth.register, routes.auth.register);
  }, [bathroomId, requestedDraftId, requireAuth, router]);

  const loadBathroomDetail = useCallback(async () => {
    if (!bathroomId) {
      setBathroomError('We could not identify the bathroom you wanted to claim.');
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
          setFormState((currentState) => {
            if (currentState.contact_email.trim()) {
              return currentState;
            }

            return createInitialFormState(user?.email);
          });
          setActiveDraftId(null);
          setRestoredDraftMessage(null);
          setIsHydratingDraft(false);
        }
        return;
      }

      setIsHydratingDraft(true);

      try {
        const availableDrafts = requestedDraftId
          ? []
          : await claimBusinessDrafts.list(user.id);
        const draft =
          requestedDraftId
            ? await claimBusinessDrafts.get(requestedDraftId)
            : availableDrafts.find((candidateDraft) => candidateDraft.data.bathroom_id === bathroomId) ?? null;

        if (!isMounted) {
          return;
        }

        if (draft && draft.data.bathroom_id === bathroomId) {
          setFormState(hydrateFormStateFromDraft(draft.data, user.email));
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved business claim draft has been restored.'
              : 'Your latest draft for this location has been restored.'
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

        setFormState(createInitialFormState(user.email));
        setActiveDraftId(null);
        setRestoredDraftMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showToast({
          title: 'Draft unavailable',
          message: getErrorMessage(error, 'We could not restore your saved business claim draft right now.'),
          variant: 'warning',
        });
        setFormState(createInitialFormState(user.email));
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
  }, [bathroomId, requestedDraftId, showToast, user?.email, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!bathroomId || !user?.id || isSubmitting) {
      return;
    }

    const validationResult = claimBusinessSchema.safeParse({
      bathroom_id: bathroomId,
      business_name: formState.business_name,
      contact_email: formState.contact_email,
      contact_phone: formState.contact_phone,
      evidence_url: formState.evidence_url,
    });

    if (!validationResult.success) {
      const message = getErrorMessage(validationResult.error, 'Fix the highlighted fields and try again.');

      setFieldErrors(getFieldErrors(validationResult.error));
      setSubmitError(message);
      showToast({
        title: 'Check your entries',
        message,
        variant: 'warning',
      });
      return;
    }

    setFieldErrors({});
    setSubmitError('');

    try {
      const outcome = await submitClaim(validationResult.data, {
        draftId: activeDraftId,
      });

      if (outcome.status !== 'auth_required') {
        await deleteDraft(activeDraftId);
        setActiveDraftId(null);
        dismissToSafely(router, routes.tabs.business, routes.bathroomDetail(bathroomId));
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to submit this business claim right now.'));
    }
  }, [activeDraftId, bathroomId, deleteDraft, formState, isSubmitting, router, showToast, submitClaim, user?.id]);

  if (isLoadingBathroom || (Boolean(user?.id) && isHydratingDraft)) {
    return <LoadingScreen message="Preparing the business claim flow for this bathroom." />;
  }

  if (!bathroomId || !bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black tracking-tight text-ink-900">Claim unavailable</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {bathroomError || 'We could not load the location you wanted to claim.'}
            </Text>
            <Button
              className="mt-6"
              label="Back To Business"
              onPress={() => dismissToSafely(router, routes.tabs.business, routes.tabs.map)}
            />
            <Button className="mt-3" label="Back To Map" onPress={closeModal} variant="secondary" />
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
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Business Claims</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to verify ownership.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Claims are tied to an account, reviewed by moderators, and tracked from the business portal.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Selected Bathroom</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">
              {formatBusinessClaimAddress(bathroomDetail)}
            </Text>
            <Button className="mt-6" label="Sign In To Claim" onPress={handleGuestSignIn} />
            <Button
              className="mt-3"
              label="Create Account"
              onPress={handleGuestRegister}
              variant="secondary"
            />
            <Button className="mt-3" label="Cancel" onPress={closeModal} variant="ghost" />
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
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Phase 5 Claim Flow</Text>
              <Text className="mt-3 text-4xl font-black tracking-tight text-white">Claim this location.</Text>
              <Text className="mt-3 text-base leading-6 text-white/80">
                Submit ownership details for moderator review. Approved claims will appear in your business portal.
              </Text>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">{bathroomDetail.place_name}</Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">
                {formatBusinessClaimAddress(bathroomDetail)}
              </Text>
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
                autoCapitalize="words"
                label="Business Name"
                onChangeText={(value) => updateField('business_name', value)}
                placeholder="Example Coffee Roasters"
                returnKeyType="next"
                value={formState.business_name}
                error={fieldErrors.business_name}
              />

              <Input
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label="Contact Email"
                onChangeText={(value) => updateField('contact_email', value)}
                placeholder="manager@example.com"
                returnKeyType="next"
                textContentType="emailAddress"
                value={formState.contact_email}
                error={fieldErrors.contact_email}
                containerClassName="mt-5"
              />

              <Input
                autoCapitalize="none"
                keyboardType="phone-pad"
                label="Contact Phone (optional)"
                onChangeText={(value) => updateField('contact_phone', value)}
                placeholder="(206) 555-0199"
                returnKeyType="next"
                textContentType="telephoneNumber"
                value={formState.contact_phone}
                error={fieldErrors.contact_phone}
                containerClassName="mt-5"
              />

              <Input
                autoCapitalize="none"
                keyboardType="url"
                label="Evidence Link (optional)"
                helperText="Add a staff page, reservation page, or another public proof of ownership."
                onChangeText={(value) => updateField('evidence_url', value)}
                placeholder="https://example.com/team"
                returnKeyType="done"
                textContentType="URL"
                value={formState.evidence_url}
                error={fieldErrors.evidence_url}
                containerClassName="mt-5"
              />
            </View>

            <TermsGate
              hasAccepted={hasAcceptedTerms}
              onAccept={() => void acceptTerms()}
              fallbackRoute="/modal/claim-business"
            />

            <View className="mt-6 gap-3">
              <Button
                disabled={hasAcceptedTerms === false}
                label="Submit Claim"
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
