import React, { memo, useMemo } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import type { BathroomPhoto } from '@/types';

interface PhotoProofGalleryProps {
  isCodeVisible: boolean;
  photos: BathroomPhoto[];
}

function PhotoProofGalleryComponent({ isCodeVisible, photos }: PhotoProofGalleryProps) {
  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (isCodeVisible) {
        return true;
      }

      return photo.photo_type !== 'keypad' && photo.photo_type !== 'sign';
    });
  }, [isCodeVisible, photos]);
  const hiddenProtectedPhotoCount = Math.max(0, photos.length - visiblePhotos.length);

  return (
    <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
      <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Photo Proof</Text>
      {visiblePhotos.length ? (
        <ScrollView
          className="mt-4"
          contentContainerStyle={{ gap: 16 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {visiblePhotos.map((photo) => (
            <View className="w-[220px]" key={photo.id}>
              <Image
                className="h-[160px] w-full rounded-[24px] bg-surface-muted"
                resizeMode="cover"
                source={{ uri: photo.public_url }}
              />
              <View className="mt-3 gap-1">
                <Text className="text-sm font-semibold capitalize text-ink-900">{photo.photo_type}</Text>
                <Text className="text-xs text-ink-600">
                  Added {new Date(photo.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
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
