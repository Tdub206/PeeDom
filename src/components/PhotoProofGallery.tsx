import React, { memo, useMemo } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import type { BathroomPhoto } from '@/types';
import { getBathroomPhotoModerationBadge } from '@/utils/bathroom-photo-moderation';

interface PhotoProofGalleryProps {
  isCodeVisible: boolean;
  photos: BathroomPhoto[];
}

const PHOTO_TYPE_LABELS: Record<BathroomPhoto['photo_type'], string> = {
  exterior: 'Entrance / exterior',
  interior: 'Stall / interior',
  keypad: 'Keypad / access point',
  sign: 'Door sign / instructions',
};

const PHOTO_TYPE_ORDER: Record<BathroomPhoto['photo_type'], number> = {
  exterior: 0,
  sign: 1,
  keypad: 2,
  interior: 3,
};

function getPhotoRecencyLabel(createdAt: string): string {
  const timestamp = new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Date unavailable';
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));

  if (ageDays === 0) {
    return 'Added today';
  }

  if (ageDays === 1) {
    return 'Added 1 day ago';
  }

  if (ageDays > 45) {
    return `Older proof (${ageDays} days)`;
  }

  return `Added ${ageDays} days ago`;
}

function PhotoProofGalleryComponent({ isCodeVisible, photos }: PhotoProofGalleryProps) {
  const visiblePhotos = useMemo(() => {
    return photos
      .filter((photo) => {
        if (isCodeVisible) {
          return true;
        }

        return photo.photo_type !== 'keypad' && photo.photo_type !== 'sign';
      })
      .sort((leftPhoto, rightPhoto) => {
        const leftOrder = PHOTO_TYPE_ORDER[leftPhoto.photo_type];
        const rightOrder = PHOTO_TYPE_ORDER[rightPhoto.photo_type];

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return new Date(rightPhoto.created_at).getTime() - new Date(leftPhoto.created_at).getTime();
      });
  }, [isCodeVisible, photos]);
  const hiddenProtectedPhotoCount = Math.max(0, photos.length - visiblePhotos.length);

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Photo Proof</Text>
      <Text className="mt-3 text-base leading-6 text-ink-600">
        Exterior, signage, and access-point photos reduce uncertainty before someone commits to the walk.
      </Text>
      {visiblePhotos.length ? (
        <ScrollView
          className="mt-4"
          contentContainerStyle={{ gap: 16 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {visiblePhotos.map((photo) => {
            const moderationBadge = getBathroomPhotoModerationBadge(photo.moderation_status);
            const moderationClassName = moderationBadge?.tone === 'danger' ? 'text-danger' : 'text-warning';

            return (
              <View className="w-[220px]" key={photo.id}>
                <Image
                  className="h-[160px] w-full rounded-[24px] bg-surface-muted"
                  resizeMode="cover"
                  source={{ uri: photo.public_url }}
                />
                <View className="mt-3 gap-1">
                  <Text className="text-sm font-semibold text-ink-900">{PHOTO_TYPE_LABELS[photo.photo_type]}</Text>
                  <Text className="text-xs text-ink-600">{getPhotoRecencyLabel(photo.created_at)}</Text>
                  {moderationBadge ? (
                    <Text className={['text-xs font-semibold uppercase tracking-[0.8px]', moderationClassName].join(' ')}>
                      {moderationBadge.label}
                    </Text>
                  ) : null}
                  {photo.photo_type === 'keypad' || photo.photo_type === 'sign' ? (
                    <Text className="text-xs font-semibold text-brand-700">Protected until code reveal</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text className="mt-4 text-base leading-6 text-ink-600">
          No public photo proof has been uploaded for this bathroom yet.
        </Text>
      )}

      {hiddenProtectedPhotoCount > 0 ? (
        <Text className="mt-4 text-sm text-ink-600">
          Reveal the code to view {hiddenProtectedPhotoCount} protected keypad or sign proof photo
          {hiddenProtectedPhotoCount === 1 ? '' : 's'}.
        </Text>
      ) : null}
    </View>
  );
}

export const PhotoProofGallery = memo(PhotoProofGalleryComponent);
