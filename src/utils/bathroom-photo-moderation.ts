import type { BathroomPhotoModerationStatus, ToastVariant } from '@/types';

export interface BathroomPhotoUploadToastCopy {
  title: string;
  message: string;
  variant: ToastVariant;
}

export interface BathroomPhotoModerationBadge {
  label: string;
  tone: 'warning' | 'danger';
}

export function getBathroomPhotoUploadToastCopy(
  moderationStatus: BathroomPhotoModerationStatus
): BathroomPhotoUploadToastCopy {
  switch (moderationStatus) {
    case 'pending':
      return {
        title: 'Photo proof submitted',
        message: 'Thanks. Your photo proof is queued for review and will appear publicly after approval.',
        variant: 'success',
      };
    case 'rejected':
      return {
        title: 'Photo proof submitted',
        message: 'Thanks. Your photo proof was saved, but it needs moderator attention before it can appear publicly.',
        variant: 'warning',
      };
    case 'approved':
    default:
      return {
        title: 'Photo proof uploaded',
        message: 'Thanks. Your photo proof is now attached to this bathroom.',
        variant: 'success',
      };
  }
}

export function getBathroomPhotoModerationBadge(
  moderationStatus: BathroomPhotoModerationStatus
): BathroomPhotoModerationBadge | null {
  switch (moderationStatus) {
    case 'pending':
      return {
        label: 'Pending review',
        tone: 'warning',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        tone: 'danger',
      };
    case 'approved':
    default:
      return null;
  }
}
