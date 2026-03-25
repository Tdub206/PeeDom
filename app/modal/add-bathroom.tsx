import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBathroomSubmissions } from '@/hooks/useBathroomSubmissions';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { addBathroomDrafts } from '@/lib/draft-manager';
import { dismissToSafely, pushSafely } from '@/lib/navigation';
import { useMapStore } from '@/store/useMapStore';
import { AddBathroomDraft, BathroomPhotoUploadInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import {
  AddBathroomFormValues,
  FieldErrors,
  addBathroomSchema,
  bathroomPhotoSchema,
  getFieldErrors,
} from '@/utils/validate';

interface AddBathroomFormState {
  place_name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  is_locked: boolean;
  is_accessible: boolean;
  is_customer_only: boolean;
}

const INITIAL_FORM_STATE: AddBathroomFormState = {
  place_name: '',
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  is_locked: false,
  is_accessible: false,
  is_customer_only: false,
};

const TOGGLE_OPTIONS: Array<{
  key: 'is_accessible' | 'is_locked' | 'is_customer_only';
  label: string;
  description: string;
}> = [
  {
    key: 'is_accessible',
    label: 'Accessible',
    description: 'Mark if the restroom is wheelchair accessible.',
  },
  {
    key: 'is_locked',
    label: 'Locked',
    description: 'Mark if a code or key is usually required.',
  },
  {
    key: 'is_customer_only',
    label: 'Customers only',
    description: 'Mark if staff usually restrict access to customers.',
  },
];

function formatCoordinateValue(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return value.toFixed(6);
}

function parseDraftId(rawDraftId?: string | string[]): string | null {
  if (!rawDraftId) {
    return null;
  }

  return Array.isArray(rawDraftId) ? rawDraftId[0] ?? null : rawDraftId;
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function toDraftPayload(
  formState: AddBathroomFormState,
  selectedPhoto: BathroomPhotoUploadInput | null
): AddBathroomDraft {
  return {
    place_name: formState.place_name.trim(),
    address_line1: formState.address_line1.trim() || undefined,
    city: formState.city.trim() || undefined,
    state: formState.state.trim() || undefined,
    postal_code: formState.postal_code.trim() || undefined,
    latitude: parseOptionalNumber(formState.latitude),
    longitude: parseOptionalNumber(formState.longitude),
    is_locked: formState.is_locked,
    is_accessible: formState.is_accessible,
    is_customer_only: formState.is_customer_only,
    photo_uri: selectedPhoto?.uri,
    photo_file_name: selectedPhoto?.fileName ?? undefined,
    photo_mime_type: selectedPhoto?.mimeType ?? undefined,
    photo_file_size: selectedPhoto?.fileSize ?? undefined,
    photo_width: selectedPhoto?.width ?? undefined,
    photo_height: selectedPhoto?.height ?? undefined,
  };
}

function fromDraftPayload(draft: AddBathroomDraft): {
  formState: AddBathroomFormState;
  photo: BathroomPhotoUploadInput | null;
} {
  return {
    formState: {
      place_name: draft.place_name ?? '',
      address_line1: draft.address_line1 ?? '',
      city: draft.city ?? '',
      state: draft.state ?? '',
      postal_code: draft.postal_code ?? '',
      latitude: formatCoordinateValue(draft.latitude),
      longitude: formatCoordinateValue(draft.longitude),
      is_locked: Boolean(draft.is_locked),
      is_accessible: Boolean(draft.is_accessible),
      is_customer_only: Boolean(draft.is_customer_only),
    },
    photo: draft.photo_uri
      ? {
          uri: draft.photo_uri,
          fileName: draft.photo_file_name ?? null,
          mimeType: draft.photo_mime_type ?? null,
          fileSize: draft.photo_file_size ?? null,
          width: draft.photo_width ?? null,
          height: draft.photo_height ?? null,
        }
      : null,
  };
}

function formatFileSize(fileSize?: number | null): string {
  if (!fileSize || fileSize <= 0) {
    return 'Unknown size';
  }

  if (fileSize < 1024 * 1024) {
    return `${Math.round(fileSize / 1024)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddBathroomModalScreen() {
  const router = useRouter();
  const { draft_id } = useLocalSearchParams<{ draft_id?: string | string[] }>();
  const { user, requireAuth } = useAuth();
  const { showToast } = useToast();
  const { coordinates, is_refreshing, permission_status, refreshLocation, requestPermission } = useLocation();
  const mapUserLocation = useMapStore((state) => state.userLocation);
  const { isSubmitting, submitBathroom } = useBathroomSubmissions();
  const [formState, setFormState] = useState<AddBathroomFormState>(INITIAL_FORM_STATE);
  const [selectedPhoto, setSelectedPhoto] = useState<BathroomPhotoUploadInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<AddBathroomFormValues>>({});
  const [submitError, setSubmitError] = useState('');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | null>(null);

  const requestedDraftId = useMemo(() => parseDraftId(draft_id), [draft_id]);

  const closeModal = useCallback(() => {
    dismissToSafely(router, routes.tabs.map, routes.tabs.map);
  }, [router]);

  const updateField = useCallback(
    (field: keyof AddBathroomFormState, value: string | boolean) => {
      setFormState((currentState) => ({
        ...currentState,
        [field]: value,
      }));

      if (typeof value === 'string') {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [field]: undefined,
        }));
      }

      setSubmitError('');
    },
    []
  );

  const persistDraft = useCallback(
    async (announceSuccess: boolean): Promise<string | null> => {
      if (!user?.id) {
        return null;
      }

      setIsSavingDraft(true);

      try {
        const savedDraftId = await addBathroomDrafts.save(
          toDraftPayload(formState, selectedPhoto),
          user.id,
          activeDraftId ?? undefined
        );

        setActiveDraftId(savedDraftId);

        if (announceSuccess) {
          showToast({
            title: 'Draft saved',
            message: 'Your bathroom submission draft is stored on this device.',
            variant: 'success',
          });
        }

        return savedDraftId;
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to save this draft right now.');

        if (announceSuccess) {
          showToast({
            title: 'Draft not saved',
            message,
            variant: 'error',
          });
        } else {
          console.error('Unable to save the add-bathroom draft:', error);
        }

        return null;
      } finally {
        setIsSavingDraft(false);
      }
    },
    [activeDraftId, formState, selectedPhoto, showToast, user?.id]
  );

  const deleteDraft = useCallback(
    async (draftIdToDelete: string | null) => {
      if (!user?.id || !draftIdToDelete) {
        return;
      }

      try {
        await addBathroomDrafts.delete(draftIdToDelete, user.id);
      } catch (error) {
        console.error('Unable to delete a completed bathroom draft:', error);
      }
    },
    [user?.id]
  );

  const resetToFreshForm = useCallback(async () => {
    setIsResettingDraft(true);

    try {
      await deleteDraft(activeDraftId);
      setActiveDraftId(null);
      setFormState(INITIAL_FORM_STATE);
      setSelectedPhoto(null);
      setRestoredDraftMessage(null);
      setFieldErrors({});
      setSubmitError('');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to clear the current draft right now.');
      showToast({
        title: 'Draft reset failed',
        message,
        variant: 'error',
      });
    } finally {
      setIsResettingDraft(false);
    }
  }, [activeDraftId, deleteDraft, showToast]);

  useEffect(() => {
    let isMounted = true;

    const hydrateDraft = async () => {
      if (!user?.id) {
        if (isMounted) {
          setIsHydratingDraft(false);
        }
        return;
      }

      setIsHydratingDraft(true);

      try {
        const draft =
          requestedDraftId
            ? await addBathroomDrafts.get(requestedDraftId)
            : (await addBathroomDrafts.list(user.id))[0] ?? null;

        if (!isMounted) {
          return;
        }

        if (draft) {
          const hydratedState = fromDraftPayload(draft.data);
          setFormState(hydratedState.formState);
          setSelectedPhoto(hydratedState.photo);
          setActiveDraftId(draft.id);
          setRestoredDraftMessage(
            requestedDraftId
              ? 'Your saved bathroom draft has been restored.'
              : 'Your latest unsent bathroom draft has been restored.'
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showToast({
          title: 'Draft unavailable',
          message: getErrorMessage(error, 'We could not restore a saved bathroom draft right now.'),
          variant: 'warning',
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
  }, [requestedDraftId, showToast, user?.id]);

  useEffect(() => {
    if (isHydratingDraft) {
      return;
    }

    const preferredCoordinates = mapUserLocation ?? coordinates;

    if (!preferredCoordinates || formState.latitude || formState.longitude) {
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      latitude: formatCoordinateValue(preferredCoordinates.latitude),
      longitude: formatCoordinateValue(preferredCoordinates.longitude),
    }));
  }, [coordinates, formState.latitude, formState.longitude, isHydratingDraft, mapUserLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      if (permission_status !== 'granted') {
        const granted = await requestPermission();

        if (!granted) {
          return;
        }
      }

      await refreshLocation();

      const latestCoordinates = useMapStore.getState().userLocation ?? coordinates ?? mapUserLocation;

      if (!latestCoordinates) {
        showToast({
          title: 'Location unavailable',
          message: 'We could not read your current location. Enter coordinates manually instead.',
          variant: 'warning',
        });
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        latitude: formatCoordinateValue(latestCoordinates.latitude),
        longitude: formatCoordinateValue(latestCoordinates.longitude),
      }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        latitude: undefined,
        longitude: undefined,
      }));
    } catch (error) {
      showToast({
        title: 'Location unavailable',
        message: getErrorMessage(error, 'We could not fill your current coordinates right now.'),
        variant: 'error',
      });
    }
  }, [coordinates, mapUserLocation, permission_status, refreshLocation, requestPermission, showToast]);

  const handlePickPhoto = useCallback(async () => {
    setIsPickingPhoto(true);

    try {
      const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResponse.granted) {
        showToast({
          title: 'Photo permission needed',
          message: 'Allow photo access to attach a bathroom image from your library.',
          variant: 'warning',
        });
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets.length) {
        return;
      }

      const asset = pickerResult.assets[0];
      const parsedPhoto = bathroomPhotoSchema.safeParse({
        uri: asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        fileSize: asset.fileSize ?? null,
        width: asset.width || null,
        height: asset.height || null,
      });

      if (!parsedPhoto.success) {
        showToast({
          title: 'Photo not accepted',
          message: getErrorMessage(parsedPhoto.error, 'Select a JPG, PNG, or WEBP photo under 5 MB.'),
          variant: 'warning',
        });
        return;
      }

      setSelectedPhoto(parsedPhoto.data);
    } catch (error) {
      showToast({
        title: 'Photo picker unavailable',
        message: getErrorMessage(error, 'We could not open the photo library right now.'),
        variant: 'error',
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    const parsedResult = addBathroomSchema.safeParse({
      ...formState,
      latitude: formState.latitude,
      longitude: formState.longitude,
    });

    if (!parsedResult.success) {
      const nextFieldErrors = getFieldErrors(parsedResult.error);
      const message = getErrorMessage(parsedResult.error, 'Fix the highlighted bathroom details and try again.');

      setFieldErrors(nextFieldErrors);
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

    const draftIdForSubmit = await persistDraft(false);

    try {
      const outcome = await submitBathroom(
        {
          ...parsedResult.data,
          photo: selectedPhoto,
        },
        {
          draftId: draftIdForSubmit ?? activeDraftId,
        }
      );

      if (outcome.status !== 'completed') {
        return;
      }

      await deleteDraft(draftIdForSubmit ?? activeDraftId);
      dismissToSafely(router, routes.bathroomDetail(outcome.bathroomId), routes.tabs.map);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to add this bathroom right now.'));
    }
  }, [activeDraftId, deleteDraft, formState, persistDraft, router, selectedPhoto, showToast, submitBathroom]);

  const handleSignIn = useCallback(() => {
    const authenticatedUser = requireAuth({
      type: 'add_bathroom',
      route: '/modal/add-bathroom',
      params: {},
      replay_strategy: 'draft_resume',
    });

    if (!authenticatedUser) {
      pushSafely(router, routes.auth.login, routes.auth.login);
    }
  }, [requireAuth, router]);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6">
          <View className="rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Sign in to add a spot</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              Bathroom submissions are tied to your account so the community can trust who added them.
            </Text>
            <Button className="mt-6" label="Sign In" onPress={handleSignIn} />
            <Button className="mt-3" label="Back To Map" onPress={closeModal} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isHydratingDraft) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6">
          <View className="items-center rounded-[30px] border border-surface-strong bg-surface-card p-6">
            <ActivityIndicator />
            <Text className="mt-4 text-lg font-bold text-ink-900">Restoring your draft</Text>
            <Text className="mt-2 text-center text-sm leading-6 text-ink-600">
              Loading any saved bathroom details from this device.
            </Text>
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
        <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          <View className="px-6 py-8">
            <View className="rounded-[30px] bg-brand-600 px-5 py-5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Community Contribution</Text>
              <Text className="mt-2 text-3xl font-black tracking-tight text-white">Add a dependable bathroom.</Text>
              <Text className="mt-2 text-sm leading-6 text-white/85">
                Submit the location, accessibility details, and an optional photo so the next person can trust the stop.
              </Text>
            </View>

            {restoredDraftMessage ? (
              <View className="mt-4 rounded-[28px] border border-brand-200 bg-brand-50 px-4 py-4">
                <Text className="text-sm font-semibold text-brand-700">Draft restored</Text>
                <Text className="mt-1 text-sm leading-5 text-brand-700">{restoredDraftMessage}</Text>
                <Pressable accessibilityRole="button" className="mt-3 self-start" onPress={() => void resetToFreshForm()}>
                  <Text className="text-sm font-semibold text-brand-700">
                    {isResettingDraft ? 'Clearing draft...' : 'Start fresh'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Input
                autoCapitalize="words"
                label="Bathroom name"
                onChangeText={(value) => updateField('place_name', value)}
                placeholder="Union Station lower level"
                returnKeyType="next"
                value={formState.place_name}
                error={fieldErrors.place_name}
              />

              <Input
                autoCapitalize="words"
                containerClassName="mt-5"
                label="Street address"
                onChangeText={(value) => updateField('address_line1', value)}
                placeholder="123 Main St"
                returnKeyType="next"
                value={formState.address_line1}
                error={fieldErrors.address_line1}
              />

              <View className="mt-5 flex-row gap-3">
                <View className="flex-1">
                  <Input
                    autoCapitalize="words"
                    label="City"
                    onChangeText={(value) => updateField('city', value)}
                    placeholder="Seattle"
                    returnKeyType="next"
                    value={formState.city}
                    error={fieldErrors.city}
                  />
                </View>
                <View className="w-[34%]">
                  <Input
                    autoCapitalize="characters"
                    label="State"
                    onChangeText={(value) => updateField('state', value)}
                    placeholder="WA"
                    returnKeyType="next"
                    value={formState.state}
                    error={fieldErrors.state}
                  />
                </View>
              </View>

              <Input
                autoCapitalize="characters"
                containerClassName="mt-5"
                label="Postal code"
                onChangeText={(value) => updateField('postal_code', value)}
                placeholder="98101"
                returnKeyType="next"
                value={formState.postal_code}
                error={fieldErrors.postal_code}
              />
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Coordinates</Text>
                  <Text className="mt-2 text-sm leading-6 text-ink-600">
                    Use your current device location or enter latitude and longitude manually.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2"
                  onPress={() => {
                    void handleUseCurrentLocation();
                  }}
                >
                  <Text className="text-sm font-semibold text-brand-700">
                    {is_refreshing ? 'Locating...' : 'Use my location'}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-5 flex-row gap-3">
                <View className="flex-1">
                  <Input
                    keyboardType="decimal-pad"
                    label="Latitude"
                    onChangeText={(value) => updateField('latitude', value)}
                    placeholder="47.606200"
                    returnKeyType="next"
                    value={formState.latitude}
                    error={fieldErrors.latitude}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    keyboardType="decimal-pad"
                    label="Longitude"
                    onChangeText={(value) => updateField('longitude', value)}
                    placeholder="-122.332100"
                    returnKeyType="done"
                    value={formState.longitude}
                    error={fieldErrors.longitude}
                  />
                </View>
              </View>
            </View>

            <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Attributes</Text>
              <View className="mt-4 gap-3">
                {TOGGLE_OPTIONS.map((option) => {
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
                      onPress={() => updateField(option.key, !formState[option.key])}
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
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Photo (optional)</Text>
                  <Text className="mt-2 text-sm leading-6 text-ink-600">
                    Attach one recent photo under 5 MB to increase trust in the location.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="rounded-full border border-surface-strong bg-surface-base px-4 py-2"
                  onPress={() => {
                    void handlePickPhoto();
                  }}
                >
                  <Text className="text-sm font-semibold text-ink-700">{isPickingPhoto ? 'Opening...' : 'Choose photo'}</Text>
                </Pressable>
              </View>

              {selectedPhoto ? (
                <View className="mt-4 rounded-[24px] border border-surface-strong bg-surface-base p-3">
                  <Image
                    source={{ uri: selectedPhoto.uri }}
                    resizeMode="cover"
                    style={{ width: '100%', height: 180, borderRadius: 20 }}
                  />
                  <Text className="mt-3 text-base font-bold text-ink-900">
                    {selectedPhoto.fileName ?? 'Selected bathroom photo'}
                  </Text>
                  <Text className="mt-1 text-sm text-ink-600">
                    {selectedPhoto.mimeType ?? 'Unknown type'} • {formatFileSize(selectedPhoto.fileSize)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 self-start rounded-full border border-danger/20 bg-danger/10 px-4 py-2"
                    onPress={() => setSelectedPhoto(null)}
                  >
                    <Text className="text-sm font-semibold text-danger">Remove photo</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {submitError ? (
              <Text className="mt-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</Text>
            ) : null}

            <View className="mt-6 gap-3">
              <Button
                label="Submit Bathroom"
                loading={isSubmitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />
              <Button
                label={isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                loading={isSavingDraft}
                onPress={() => {
                  void persistDraft(true);
                }}
                variant="secondary"
              />
              <Button label="Cancel" onPress={closeModal} variant="ghost" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
