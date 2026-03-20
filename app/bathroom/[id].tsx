import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { fetchLatestVisibleBathroomCode, type BathroomAccessCodeRow } from '@/api/access-codes';
import { fetchBathroomDetailById, PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { CodeConfidenceCard } from '@/components/CodeConfidenceCard';
import { CodeRevealCard } from '@/components/CodeRevealCard';
import { CodeVerificationCard } from '@/components/CodeVerificationCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PhotoProofGallery } from '@/components/PhotoProofGallery';
import { PremiumArrivalAlertCard } from '@/components/PremiumArrivalAlertCard';
import { AccessibilitySummaryCard } from '@/components/accessibility/AccessibilitySummaryCard';
import { BathroomStatusBanner, LiveCodeBadge } from '@/components/realtime';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomCodeVerification } from '@/hooks/useBathroomCodeVerification';
import { useCleanlinessRating } from '@/hooks/useCleanlinessRating';
import { useBathroomPhotos } from '@/hooks/useBathroomPhotos';
import { usePremiumArrivalAlert } from '@/hooks/usePremiumArrivalAlert';
import { useRealtimeCodeVotes } from '@/hooks/useRealtimeCodeVotes';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { useRewardedCodeUnlock } from '@/hooks/useRewardedCodeUnlock';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely, replaceSafely } from '@/lib/navigation';
import { BathroomPhotoType } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { bathroomPhotoSchema } from '@/utils/validate';

type HoursEntry = { open: string; close: string };
type PhotoTypeOption = {
  value: BathroomPhotoType;
  label: string;
  description: string;
};

const PHOTO_TYPE_OPTIONS: PhotoTypeOption[] = [
  {
    value: 'interior',
    label: 'Interior',
    description: 'General bathroom condition and cleanliness.',
  },
  {
    value: 'exterior',
    label: 'Exterior',
    description: 'Entrance, hallway, or storefront context.',
  },
  {
    value: 'keypad',
    label: 'Keypad',
    description: 'Protected proof of the keypad or lock hardware.',
  },
  {
    value: 'sign',
    label: 'Door sign',
    description: 'Protected proof of posted instructions or code signage.',
  },
];

function formatAddress(detail: PublicBathroomDetailRow): string {
  return [
    detail.address_line1,
    [detail.city, detail.state].filter(Boolean).join(', '),
    detail.postal_code,
    detail.country_code,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatHours(hoursJson: PublicBathroomDetailRow['hours_json']): string[] {
  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return [];
  }

  return Object.entries(hoursJson).flatMap(([day, hours]) => {
    if (!Array.isArray(hours)) {
      return [];
    }

    const validRanges = hours.filter(
      (entry): entry is HoursEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as HoursEntry).open === 'string' &&
        typeof (entry as HoursEntry).close === 'string'
    );

    if (!validRanges.length) {
      return [];
    }

    return `${day}: ${validRanges.map((entry) => `${entry.open} - ${entry.close}`).join(', ')}`;
  });
}

export default function BathroomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const hasLoadedBathroomDetailRef = useRef(false);
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [revealedCode, setRevealedCode] = useState<BathroomAccessCodeRow | null>(null);
  const [codeErrorMessage, setCodeErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [pendingVerificationVote, setPendingVerificationVote] = useState<-1 | 1 | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<BathroomPhotoType>('interior');

  const bathroomId = useMemo(() => {
    if (Array.isArray(id)) {
      return id[0] ?? '';
    }

    return id ?? '';
  }, [id]);

  const address = useMemo(
    () => (bathroomDetail ? formatAddress(bathroomDetail) : 'Address unavailable'),
    [bathroomDetail]
  );
  const hours = useMemo(
    () => (bathroomDetail ? formatHours(bathroomDetail.hours_json) : []),
    [bathroomDetail]
  );
  const isPremiumUser = hasActivePremium(profile);
  const {
    hasUnlock: hasRewardedCodeUnlock,
    isUnlocking: isUnlockingWithAd,
    isAdUnlockAvailable,
    adUnlockUnavailableReason,
    unlockIssue,
    unlockWithAd,
  } = useRewardedCodeUnlock({
    bathroomId: bathroomId || null,
    userId: user?.id ?? null,
  });
  const shouldRevealCode = Boolean(bathroomDetail?.code_id) && (isPremiumUser || hasRewardedCodeUnlock);
  const visibleCodeValue = useMemo(() => {
    const nextValue = revealedCode?.code_value?.trim();
    return nextValue ? nextValue : null;
  }, [revealedCode?.code_value]);
  const codeRevealIssueMessage = codeErrorMessage ?? unlockIssue;
  const trustScore = revealedCode?.confidence_score ?? bathroomDetail?.confidence_score ?? null;
  const trustUpVotes = revealedCode?.up_votes ?? bathroomDetail?.up_votes ?? 0;
  const trustDownVotes = revealedCode?.down_votes ?? bathroomDetail?.down_votes ?? 0;
  const trustLastVerifiedAt = revealedCode?.last_verified_at ?? bathroomDetail?.last_verified_at ?? null;

  const loadBathroomDetail = useCallback(async (showLoadingState = true) => {
    if (!bathroomId) {
      const message = 'The bathroom identifier was missing from the route.';
      setErrorMessage(message);
      setIsLoading(false);
      return;
    }

    if (showLoadingState) {
      setIsLoading(true);
    }

    setErrorMessage('');

    try {
      const result = await fetchBathroomDetailById(bathroomId);

      if (result.error || !result.data) {
        const message = getErrorMessage(result.error, 'Unable to load bathroom details right now.');

        if (showLoadingState) {
          setBathroomDetail(null);
        }

        setErrorMessage(message);
        showToast({
          title: 'Detail unavailable',
          message,
          variant: 'error',
        });
        return;
      }

      setBathroomDetail(result.data);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load bathroom details right now.');

      if (showLoadingState) {
        setBathroomDetail(null);
      }

      setErrorMessage(message);
      showToast({
        title: 'Detail unavailable',
        message,
        variant: 'error',
      });
    } finally {
      if (showLoadingState) {
        setIsLoading(false);
      }
    }
  }, [bathroomId, showToast]);

  const loadVisibleCode = useCallback(async () => {
    if (!bathroomId || !bathroomDetail?.code_id || !shouldRevealCode) {
      setRevealedCode(null);
      setCodeErrorMessage(null);
      setIsLoadingCode(false);
      return;
    }

    setIsLoadingCode(true);
    setCodeErrorMessage(null);

    try {
      const result = await fetchLatestVisibleBathroomCode(bathroomId);

      if (result.error) {
        setRevealedCode(null);
        setCodeErrorMessage(getErrorMessage(result.error, 'Unable to load the current bathroom code right now.'));
        return;
      }

      if (!result.data) {
        setRevealedCode(null);
        setCodeErrorMessage('The latest verified bathroom code is not available right now.');
        return;
      }

      setRevealedCode(result.data);
      setCodeErrorMessage(null);
    } catch (error) {
      setRevealedCode(null);
      setCodeErrorMessage(getErrorMessage(error, 'Unable to load the current bathroom code right now.'));
    } finally {
      setIsLoadingCode(false);
    }
  }, [bathroomDetail?.code_id, bathroomId, shouldRevealCode]);

  const refreshTrustSignals = useCallback(async () => {
    await Promise.all([loadBathroomDetail(false), loadVisibleCode()]);
  }, [loadBathroomDetail, loadVisibleCode]);

  useRealtimeCodeVotes({
    bathroomId: bathroomId || null,
    codeId: bathroomDetail?.code_id ?? null,
    currentUserId: user?.id ?? null,
    onChange: refreshTrustSignals,
  });

  const { currentVote, isSubmittingVote, submitVerificationVote } = useBathroomCodeVerification({
    bathroomId,
    codeId: bathroomDetail?.code_id ?? null,
    onVoteRecorded: refreshTrustSignals,
  });
  const { isLoadingPhotos, isUploadingPhoto, photos, photosError, uploadPhotoProof } = useBathroomPhotos({
    bathroomId,
    includeProtectedTypes: Boolean(visibleCodeValue),
  });
  const {
    activeAlert,
    alertsError,
    armAlert,
    cancelAlert,
    isAlertLoading,
    isAlertUpdating,
  } = usePremiumArrivalAlert(bathroomId || null);
  const {
    currentRating,
    isLoadingCurrentRating,
  } = useCleanlinessRating(bathroomId || null);
  const livePresence = useRealtimePresence({
    bathroomId: bathroomId || null,
    userId: user?.id ?? null,
  });

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoadingState = !hasLoadedBathroomDetailRef.current;

      hasLoadedBathroomDetailRef.current = true;
      void loadBathroomDetail(shouldShowLoadingState);

      return undefined;
    }, [loadBathroomDetail])
  );

  useEffect(() => {
    void loadVisibleCode();
  }, [loadVisibleCode]);

  const handleUnlockWithAd = useCallback(() => {
    void unlockWithAd();
  }, [unlockWithAd]);

  const handleWorkedVote = useCallback(async () => {
    setPendingVerificationVote(1);

    try {
      await submitVerificationVote(1);
    } finally {
      setPendingVerificationVote(null);
    }
  }, [submitVerificationVote]);

  const handleFailedVote = useCallback(async () => {
    if (!bathroomDetail) {
      return;
    }

    setPendingVerificationVote(-1);

    try {
      const outcome = await submitVerificationVote(-1);

      if (outcome === 'completed' || outcome === 'queued_retry') {
        pushSafely(
          router,
          routes.modal.reportBathroom(bathroomDetail.id, 'wrong_code'),
          routes.bathroomDetail(bathroomDetail.id)
        );
      }
    } finally {
      setPendingVerificationVote(null);
    }
  }, [bathroomDetail, router, submitVerificationVote]);

  const handleUploadPhotoProof = useCallback(async () => {
    if (!bathroomId) {
      return;
    }

    setIsPickingPhoto(true);

    try {
      const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResponse.granted) {
        showToast({
          title: 'Photo permission needed',
          message: 'Allow photo access to attach proof photos from your library.',
          variant: 'warning',
        });
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
        quality: 0.82,
        selectionLimit: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets.length) {
        return;
      }

      const selectedAsset = pickerResult.assets[0];
      const parsedPhoto = bathroomPhotoSchema.safeParse({
        uri: selectedAsset.uri,
        fileName: selectedAsset.fileName ?? null,
        mimeType: selectedAsset.mimeType ?? null,
        fileSize: selectedAsset.fileSize ?? null,
        width: selectedAsset.width || null,
        height: selectedAsset.height || null,
      });

      if (!parsedPhoto.success) {
        showToast({
          title: 'Photo not accepted',
          message: getErrorMessage(parsedPhoto.error, 'Select a JPG, PNG, or WEBP photo under 5 MB.'),
          variant: 'warning',
        });
        return;
      }

      await uploadPhotoProof({
        photo: parsedPhoto.data,
        photo_type: selectedPhotoType,
      });
    } catch (error) {
      showToast({
        title: 'Photo picker unavailable',
        message: getErrorMessage(error, 'We could not open the photo library right now.'),
        variant: 'error',
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }, [bathroomId, selectedPhotoType, showToast, uploadPhotoProof]);

  const handleOpenDirections = useCallback(async () => {
    if (!bathroomDetail) {
      return;
    }

    const encodedLabel = encodeURIComponent(bathroomDetail.place_name);
    const latitude = bathroomDetail.latitude;
    const longitude = bathroomDetail.longitude;
    const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
    const googleNavigationUrl = `google.navigation:q=${latitude},${longitude}`;
    const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    setIsOpeningDirections(true);

    try {
      if (Platform.OS === 'ios') {
        const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);

        if (canOpenAppleMaps) {
          await Linking.openURL(appleMapsUrl);
          return;
        }
      } else {
        const canOpenGoogleNavigation = await Linking.canOpenURL(googleNavigationUrl);

        if (canOpenGoogleNavigation) {
          await Linking.openURL(googleNavigationUrl);
          return;
        }
      }

      await Linking.openURL(browserFallbackUrl);
    } catch (error) {
      showToast({
        title: 'Navigation unavailable',
        message: getErrorMessage(error, 'We could not open navigation right now.'),
        variant: 'error',
      });
    } finally {
      setIsOpeningDirections(false);
    }
  }, [bathroomDetail, showToast]);

  if (isLoading) {
    return <LoadingScreen message="Loading this bathroom and its latest code summary." />;
  }

  if (!bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-10">
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Bathroom detail unavailable</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {errorMessage || 'We could not retrieve this bathroom right now.'}
            </Text>
            <Button
              className="mt-6"
              label="Try Again"
              onPress={() => {
                void loadBathroomDetail();
              }}
            />
            <Button
              className="mt-3"
              label="Back To Map"
              onPress={() => replaceSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="secondary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <View className="rounded-[32px] bg-brand-600 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Bathroom Detail</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">{bathroomDetail.place_name}</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">{address}</Text>
          </View>

          <BathroomStatusBanner bathroomId={bathroomDetail.id} />

          {livePresence && livePresence.viewer_count > 0 ? (
            <View className="mt-4 rounded-[28px] border border-brand-200 bg-brand-50 px-5 py-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-brand-700">Live Presence</Text>
              <Text className="mt-2 text-base font-semibold text-brand-900">
                {livePresence.viewer_count === 1
                  ? '1 live viewer session is active right now.'
                  : `${livePresence.viewer_count} live viewer sessions are active right now.`}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-brand-700">
                Guest sessions stay anonymous and disappear automatically when viewers disconnect.
              </Text>
            </View>
          ) : null}

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Access Summary</Text>
              <LiveCodeBadge isVisible={Boolean(bathroomDetail.code_id)} />
            </View>
            <Text className="mt-3 text-2xl font-bold text-ink-900">
              {bathroomDetail.code_id ? 'Code submitted' : 'No code submitted yet'}
            </Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">
              {bathroomDetail.code_id
                ? `Community confidence: ${bathroomDetail.confidence_score ?? 0}%`
                : 'This location is visible publicly, but nobody has submitted a verified code yet.'}
            </Text>

            {bathroomDetail.code_id ? (
              <View className="mt-4 gap-2 rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-medium text-ink-700">
                  Up votes: {bathroomDetail.up_votes ?? 0} | Down votes: {bathroomDetail.down_votes ?? 0}
                </Text>
                <Text className="text-sm text-ink-600">
                  Last verified:{' '}
                  {bathroomDetail.last_verified_at
                    ? new Date(bathroomDetail.last_verified_at).toLocaleString()
                    : 'Not yet verified'}
                </Text>
              </View>
            ) : null}
          </View>

          <CodeConfidenceCard
            confidenceScore={trustScore}
            downVotes={trustDownVotes}
            lastVerifiedAt={trustLastVerifiedAt}
            upVotes={trustUpVotes}
          />

          <CodeRevealCard
            hasCode={Boolean(bathroomDetail.code_id)}
            codeValue={visibleCodeValue}
            confidenceScore={revealedCode?.confidence_score ?? bathroomDetail.confidence_score ?? null}
            lastVerifiedAt={revealedCode?.last_verified_at ?? bathroomDetail.last_verified_at}
            expiresAt={revealedCode?.expires_at ?? bathroomDetail.expires_at}
            isLoadingCode={isLoadingCode}
            isUnlockingWithAd={isUnlockingWithAd}
            isPremiumUser={isPremiumUser}
            requiresAuthForUnlock={!user}
            isRewardedUnlockActive={hasRewardedCodeUnlock}
            isAdUnlockAvailable={isAdUnlockAvailable}
            unavailableReason={adUnlockUnavailableReason}
            issueMessage={codeRevealIssueMessage}
            onUnlockWithAd={handleUnlockWithAd}
          />

          <CodeVerificationCard
            currentVote={currentVote}
            hasCode={Boolean(bathroomDetail.code_id)}
            isSubmitting={isSubmittingVote}
            onFailed={() => {
              void handleFailedVote();
            }}
            onWorked={() => {
              void handleWorkedVote();
            }}
            pendingVote={pendingVerificationVote}
          />

          <PhotoProofGallery isCodeVisible={Boolean(visibleCodeValue)} photos={photos} />

          {isLoadingPhotos ? (
            <Text className="mt-4 text-sm text-ink-600">Loading the latest community proof photos...</Text>
          ) : null}

          {photosError ? (
            <Text className="mt-4 text-sm text-warning">{photosError}</Text>
          ) : null}

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Add Photo Proof</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              Upload the entrance, interior, keypad, or sign so the next person can trust what they are seeing.
            </Text>

            <View className="mt-4 gap-3">
              {PHOTO_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedPhotoType === option.value;

                return (
                  <Pressable
                    accessibilityHint={option.description}
                    accessibilityLabel={`${option.label} proof photo type`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={[
                      'rounded-2xl border px-4 py-4',
                      isSelected ? 'border-brand-600 bg-brand-50' : 'border-surface-strong bg-surface-base',
                    ].join(' ')}
                    key={option.value}
                    onPress={() => setSelectedPhotoType(option.value)}
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

            {(selectedPhotoType === 'keypad' || selectedPhotoType === 'sign') ? (
              <Text className="mt-4 text-sm text-ink-600">
                Keypad and sign proof stays protected until users reveal the code.
              </Text>
            ) : null}

            <Button
              className="mt-5"
              label={isUploadingPhoto || isPickingPhoto ? 'Uploading Photo Proof...' : 'Upload Photo Proof'}
              loading={isUploadingPhoto || isPickingPhoto}
              onPress={() => {
                void handleUploadPhotoProof();
              }}
            />
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Facility Notes</Text>
            <View className="mt-4 gap-3">
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Locked</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_locked ? 'Yes' : 'No or not reported'}
                </Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Accessible</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_accessible
                    ? `${bathroomDetail.accessibility_score ?? 0}/100 accessibility score`
                    : 'Not reported'}
                </Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Customer only</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_customer_only ? 'Yes' : 'Open to the public'}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Cleanliness</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">
              {typeof bathroomDetail.cleanliness_avg === 'number'
                ? `${bathroomDetail.cleanliness_avg.toFixed(1)} / 5 community average`
                : 'No cleanliness ratings yet'}
            </Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">
              Share how clean this bathroom was when you arrived so future riders can filter for more reliable stops.
            </Text>
            {isLoadingCurrentRating ? (
              <Text className="mt-3 text-sm text-ink-600">Loading your previous rating...</Text>
            ) : currentRating ? (
              <View className="mt-4 rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Your last rating</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {`${String.fromCharCode(9733).repeat(currentRating.rating)}${String.fromCharCode(9734).repeat(5 - currentRating.rating)} ${currentRating.rating} / 5`}
                </Text>
                {currentRating.notes ? (
                  <Text className="mt-2 text-sm leading-5 text-ink-600">{currentRating.notes}</Text>
                ) : null}
              </View>
            ) : null}
            <Button
              className="mt-5"
              label={currentRating ? 'Update Cleanliness Rating' : 'Rate Cleanliness'}
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.rateCleanlinessBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="secondary"
            />
          </View>

          <View className="mt-6">
            <AccessibilitySummaryCard
              accessibilityFeatures={bathroomDetail.accessibility_features}
              accessibilityScore={bathroomDetail.accessibility_score ?? 0}
              isAccessible={bathroomDetail.is_accessible}
            />
            <Button
              className="mt-4"
              label="Update Accessibility Details"
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.updateAccessibilityBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="secondary"
            />
          </View>

          <PremiumArrivalAlertCard
            activeAlert={activeAlert}
            isLoading={isAlertLoading}
            isPremiumUser={isPremiumUser}
            isUpdating={isAlertUpdating}
            onArmAlert={(minutes) => {
              void armAlert(minutes);
            }}
            onCancelAlert={() => {
              void cancelAlert();
            }}
          />

          {alertsError ? (
            <Text className="mt-4 text-sm text-warning">{alertsError}</Text>
          ) : null}

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Hours</Text>
            {hours.length ? (
              <View className="mt-4 gap-2">
                {hours.map((line) => (
                  <Text className="text-base text-ink-700" key={line}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="mt-4 text-base leading-6 text-ink-600">
                Hours have not been reported for this bathroom yet.
              </Text>
            )}
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Community Actions</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              Open navigation, report a problem, or start a business ownership claim for this location.
            </Text>
            <Button
              className="mt-4"
              label="Open Navigation"
              loading={isOpeningDirections}
              onPress={() => {
                void handleOpenDirections();
              }}
            />
            <Button
              className="mt-3"
              label={bathroomDetail.code_id ? 'Submit Updated Code' : 'Submit Access Code'}
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.submitCodeBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="secondary"
            />
            <Button
              className="mt-3"
              label="Claim This Business"
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.claimBusinessBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="secondary"
            />
            <Button
              className="mt-3"
              label="Report An Issue"
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.reportBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="destructive"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
