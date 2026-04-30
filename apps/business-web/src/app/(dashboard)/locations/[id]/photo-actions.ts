'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteBusinessPhotoSchema,
  uploadBusinessPhotoSchema,
} from '../../../../lib/business/schemas';
import {
  BATHROOM_PHOTO_BUCKET,
  MAX_BATHROOM_PHOTO_BYTES,
  buildBathroomPhotoStoragePath,
  isAllowedBathroomPhotoType,
} from '../../../../lib/business/photo-storage';
import { getApprovedLocationById } from '../../../../lib/business/queries';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

type BathroomPhotoModerationStatus = 'approved' | 'pending' | 'rejected';

interface BathroomPhotoInsert {
  bathroom_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  content_type: string;
  file_size_bytes: number;
  photo_type: 'exterior' | 'interior' | 'keypad' | 'sign';
  moderation_status: BathroomPhotoModerationStatus;
}

interface InsertedBathroomPhotoRecord {
  id: string;
  storage_path: string;
  moderation_status: BathroomPhotoModerationStatus;
}

interface ExistingBathroomPhotoRecord {
  id: string;
  bathroom_id: string;
  storage_path: string;
}

interface BathroomPhotoInsertBuilder {
  select(columns: 'id, storage_path, moderation_status'): {
    single(): Promise<{
      data: InsertedBathroomPhotoRecord | null;
      error: { message: string } | null;
    }>;
  };
}

interface BathroomPhotoLookupBuilder {
  eq(column: 'id', value: string): {
    eq(column: 'bathroom_id', value: string): {
      maybeSingle(): Promise<{
        data: ExistingBathroomPhotoRecord | null;
        error: { message: string } | null;
      }>;
    };
  };
}

interface BathroomPhotoDeleteBuilder {
  eq(column: 'id', value: string): {
    eq(column: 'bathroom_id', value: string): Promise<{
      error: { message: string } | null;
    }>;
  };
}

interface BathroomPhotoTableClient {
  from(table: 'bathroom_photos'): {
    insert(values: BathroomPhotoInsert): BathroomPhotoInsertBuilder;
    select(columns: 'id, bathroom_id, storage_path'): BathroomPhotoLookupBuilder;
    delete(): BathroomPhotoDeleteBuilder;
  };
}

type UploadedPhoto = {
  id: string;
  storage_path: string;
  url: string;
  moderation_status: BathroomPhotoModerationStatus;
};

export type UploadBathroomPhotoResult =
  | { ok: true; photo: UploadedPhoto }
  | { ok: false; error: string };

export type DeleteBathroomPhotoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function uploadBathroomPhoto(
  formData: FormData
): Promise<UploadBathroomPhotoResult> {
  const parsedInput = uploadBusinessPhotoSchema.safeParse({
    bathroom_id: formData.get('bathroom_id'),
  });

  if (!parsedInput.success) {
    return {
      ok: false,
      error:
        parsedInput.error.issues[0]?.message ?? 'Select a valid location before uploading.',
    };
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return { ok: false, error: 'Select an image before uploading.' };
  }

  if (!isAllowedBathroomPhotoType(file.type)) {
    return {
      ok: false,
      error: 'Only JPEG, PNG, WebP, or GIF images are supported.',
    };
  }

  if (file.size > MAX_BATHROOM_PHOTO_BYTES) {
    return { ok: false, error: 'Each photo must be 10 MB or smaller.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const ownership = await getApprovedLocationById(
    supabase,
    user.id,
    parsedInput.data.bathroom_id
  );

  if (ownership.error) {
    return { ok: false, error: 'Unable to verify this location right now.' };
  }

  if (!ownership.location) {
    return { ok: false, error: "We couldn't find that location on your account." };
  }

  const storagePath = buildBathroomPhotoStoragePath(parsedInput.data.bathroom_id, file.name);
  const { error: storageError } = await supabase.storage
    .from(BATHROOM_PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    return { ok: false, error: 'Upload failed. Try again in a moment.' };
  }

  const insertRow: BathroomPhotoInsert = {
    bathroom_id: parsedInput.data.bathroom_id,
    uploaded_by: user.id,
    storage_bucket: BATHROOM_PHOTO_BUCKET,
    storage_path: storagePath,
    content_type: file.type,
    file_size_bytes: file.size,
    photo_type: 'interior',
    moderation_status: 'pending',
  };

  const bathroomPhotosClient = supabase as unknown as BathroomPhotoTableClient;
  const { data: insertedPhoto, error: insertError } = await bathroomPhotosClient
    .from('bathroom_photos')
    .insert(insertRow)
    .select('id, storage_path, moderation_status')
    .single();

  if (insertError || !insertedPhoto) {
    const { error: cleanupError } = await supabase.storage
      .from(BATHROOM_PHOTO_BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      console.error('[uploadBathroomPhoto] storage cleanup failed:', cleanupError.message);
    }

    return {
      ok: false,
      error: 'Upload finished, but we could not save the photo record. Please try again.',
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BATHROOM_PHOTO_BUCKET).getPublicUrl(insertedPhoto.storage_path);

  revalidatePhotoPaths(parsedInput.data.bathroom_id);

  return {
    ok: true,
    photo: {
      id: insertedPhoto.id,
      storage_path: insertedPhoto.storage_path,
      moderation_status: insertedPhoto.moderation_status,
      url: publicUrl,
    },
  };
}

export async function deleteBathroomPhoto(
  bathroomId: string,
  photoId: string
): Promise<DeleteBathroomPhotoResult> {
  const parsedInput = deleteBusinessPhotoSchema.safeParse({
    bathroom_id: bathroomId,
    photo_id: photoId,
  });

  if (!parsedInput.success) {
    return {
      ok: false,
      error:
        parsedInput.error.issues[0]?.message ?? 'Select a valid photo before deleting it.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const ownership = await getApprovedLocationById(
    supabase,
    user.id,
    parsedInput.data.bathroom_id
  );

  if (ownership.error) {
    return { ok: false, error: 'Unable to verify this location right now.' };
  }

  if (!ownership.location) {
    return { ok: false, error: "You don't have permission to delete this photo." };
  }

  const bathroomPhotosClient = supabase as unknown as BathroomPhotoTableClient;
  const { data: existingPhoto, error: existingPhotoError } = await bathroomPhotosClient
    .from('bathroom_photos')
    .select('id, bathroom_id, storage_path')
    .eq('id', parsedInput.data.photo_id)
    .eq('bathroom_id', parsedInput.data.bathroom_id)
    .maybeSingle();

  if (existingPhotoError) {
    return { ok: false, error: 'Unable to look up that photo right now.' };
  }

  if (!existingPhoto) {
    return { ok: false, error: 'That photo no longer exists.' };
  }

  const { error: deleteRowError } = await bathroomPhotosClient
    .from('bathroom_photos')
    .delete()
    .eq('id', existingPhoto.id)
    .eq('bathroom_id', existingPhoto.bathroom_id);

  if (deleteRowError) {
    return { ok: false, error: 'Could not remove the photo record. Try again in a moment.' };
  }

  const { error: storageError } = await supabase.storage
    .from(BATHROOM_PHOTO_BUCKET)
    .remove([existingPhoto.storage_path]);

  if (storageError) {
    console.error('[deleteBathroomPhoto] storage cleanup failed:', storageError.message);
  }

  revalidatePhotoPaths(parsedInput.data.bathroom_id);

  return { ok: true };
}

function revalidatePhotoPaths(bathroomId: string): void {
  revalidatePath('/locations');
  revalidatePath('/locations/[id]', 'page');
  revalidatePath(`/locations/${bathroomId}`);
}
