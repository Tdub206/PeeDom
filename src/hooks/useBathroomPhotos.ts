import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBathroomPhotos, uploadBathroomPhotoProof } from '@/api/bathroom-photos';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import { BathroomPhotoProofCreateInput } from '@/types';
import { getBathroomPhotoUploadToastCopy } from '@/utils/bathroom-photo-moderation';
import { getErrorMessage } from '@/utils/errorMap';

interface UseBathroomPhotosOptions {
  bathroomId: string;
  includeProtectedTypes?: boolean;
}

export type BathroomPhotoUploadOutcome = 'auth_required' | 'completed' | 'failed';

export function useBathroomPhotos({ bathroomId, includeProtectedTypes = false }: UseBathroomPhotosOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuth();
  const { showToast } = useToast();
  const photosQuery = useQuery({
    queryKey: ['bathroom-photos', bathroomId, includeProtectedTypes],
    enabled: Boolean(bathroomId),
    queryFn: async () => {
      const result = await fetchBathroomPhotos(bathroomId, {
        includeProtectedTypes,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (
      input: Omit<BathroomPhotoProofCreateInput, 'bathroom_id'>
    ): Promise<BathroomPhotoUploadOutcome> => {
      const returnRoute = `/bathroom/${bathroomId}`;

      const authenticatedUser = requireAuth({
        type: 'upload_bathroom_photo',
        route: returnRoute,
        params: {
          bathroom_id: bathroomId,
          photo_type: input.photo_type,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      const result = await uploadBathroomPhotoProof(authenticatedUser.id, {
        bathroom_id: bathroomId,
        ...input,
      });

      if (result.error) {
        throw result.error;
      }

      const successToast = getBathroomPhotoUploadToastCopy(result.data?.moderation_status ?? 'pending');

      await queryClient.invalidateQueries({
        queryKey: ['bathroom-photos', bathroomId],
      });

      showToast({
        title: successToast.title,
        message: successToast.message,
        variant: successToast.variant,
      });

      return 'completed';
    },
  });

  const uploadPhotoProof = useCallback(
    async (input: Omit<BathroomPhotoProofCreateInput, 'bathroom_id'>) => {
      try {
        return await uploadMutation.mutateAsync(input);
      } catch (error) {
        showToast({
          title: 'Photo upload failed',
          message: getErrorMessage(error, 'We could not upload the selected photo proof right now.'),
          variant: 'error',
        });
        return 'failed' as const;
      }
    },
    [showToast, uploadMutation]
  );

  return {
    isLoadingPhotos: photosQuery.isLoading,
    isUploadingPhoto: uploadMutation.isPending,
    photos: photosQuery.data ?? [],
    photosError: photosQuery.error ? getErrorMessage(photosQuery.error, 'Unable to load photo proof.') : null,
    uploadPhotoProof,
  };
}
