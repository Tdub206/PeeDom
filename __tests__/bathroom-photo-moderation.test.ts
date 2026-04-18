import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

import type { BathroomPhotoModerationStatus } from '@/types';
import {
  getBathroomPhotoModerationBadge,
  getBathroomPhotoUploadToastCopy,
} from '@/utils/bathroom-photo-moderation';

const photoModerationMigration = readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '041_photo_moderation_hardening.sql'),
  'utf8'
);

describe('bathroom photo moderation hardening', () => {
  it('keeps the database migration aligned with the active app moderation contract', () => {
    const pendingStatus: BathroomPhotoModerationStatus = 'pending';

    expect(pendingStatus).toBe('pending');
    expect(photoModerationMigration).toContain("alter column moderation_status set default 'pending'");
    expect(photoModerationMigration).toContain("check (moderation_status in ('approved', 'pending', 'rejected'))");
    expect(photoModerationMigration).toContain("new.moderation_status := 'pending'");
    expect(photoModerationMigration).toContain("if p_status not in ('approved', 'pending', 'rejected') then");
  });

  it('shows review-aware copy for pending and rejected uploads', () => {
    expect(getBathroomPhotoUploadToastCopy('approved')).toEqual({
      title: 'Photo proof uploaded',
      message: 'Thanks. Your photo proof is now attached to this bathroom.',
      variant: 'success',
    });
    expect(getBathroomPhotoUploadToastCopy('pending').message).toContain('queued for review');
    expect(getBathroomPhotoModerationBadge('pending')).toEqual({
      label: 'Pending review',
      tone: 'warning',
    });
    expect(getBathroomPhotoModerationBadge('rejected')).toEqual({
      label: 'Rejected',
      tone: 'danger',
    });
    expect(getBathroomPhotoModerationBadge('approved')).toBeNull();
  });
});
