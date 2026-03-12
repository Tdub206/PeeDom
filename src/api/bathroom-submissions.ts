import { File as ExpoFile } from 'expo-file-system';
import {
  BathroomCreateInput,
  BathroomPhotoUploadInput,
  DbBathroom,
  DbBathroomPhoto,
  type Database,
} from '@/types';
import { getSupabaseClient } from '@/lib/supabase';

const BATHROOM_PHOTO_BUCKET = 'bathroom-photos';
const MAX_BATHROOM_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type BathroomInsert = Database['public']['Tables']['bathrooms']['Insert'];
type BathroomPhotoInsert = Database['public']['Tables']['bathroom_photos']['Insert'];

interface AppErrorShape {
  code?: string;
  message: string;
}

interface BathroomSubmissionData {
  bathroom: DbBathroom;
  photo: DbBathroomPhoto | null;
}

interface BathroomSubmissionResponse {
  data: BathroomSubmissionData | null;
  error: (Error & { code?: string }) | null;
  warning: (Error & { code?: string }) | null;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

function normalizeOptionalText(value?: string): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function sanitizePathSegment(value: string): string {
  const sanitizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitizedValue || 'bathroom-photo';
}

function inferMimeType(photoInput: BathroomPhotoUploadInput): string {
  if (photoInput.mimeType && SUPPORTED_PHOTO_MIME_TYPES.has(photoInput.mimeType)) {
    return photoInput.mimeType;
  }

  const normalizedFileName = photoInput.fileName?.toLowerCase() ?? '';

  if (normalizedFileName.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedFileName.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function inferFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function buildPhotoStoragePath(userId: string, bathroomId: string, photoInput: BathroomPhotoUploadInput): string {
  const safeFileName = sanitizePathSegment(photoInput.fileName ?? 'bathroom-photo');
  const mimeType = inferMimeType(photoInput);
  const fileExtension = inferFileExtension(mimeType);
  const fileToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${userId}/${bathroomId}/${safeFileName}-${fileToken}.${fileExtension}`;
}

async function readPhotoArrayBuffer(photoInput: BathroomPhotoUploadInput): Promise<ArrayBuffer> {
  try {
    return await new ExpoFile(photoInput.uri).arrayBuffer();
  } catch (fileSystemError) {
    const response = await fetch(photoInput.uri);

    if (!response.ok) {
      throw toAppError(
        {
          message: 'The selected photo could not be read from your device.',
        },
        'The selected photo could not be read from your device.'
      );
    }

    return response.arrayBuffer();
  }
}

async function removeUploadedObject(storagePath: string): Promise<void> {
  try {
    const { error } = await getSupabaseClient().storage.from(BATHROOM_PHOTO_BUCKET).remove([storagePath]);

    if (error) {
      console.error('Unable to clean up an uploaded bathroom photo after a failed metadata write:', error);
    }
  } catch (error) {
    console.error('Unable to clean up an uploaded bathroom photo after a failed metadata write:', error);
  }
}

async function uploadBathroomPhoto(
  userId: string,
  bathroomId: string,
  photoInput: BathroomPhotoUploadInput
): Promise<{ data: DbBathroomPhoto | null; error: (Error & { code?: string }) | null }> {
  try {
    if (photoInput.fileSize && photoInput.fileSize > MAX_BATHROOM_PHOTO_SIZE_BYTES) {
      return {
        data: null,
        error: toAppError(
          {
            message: 'Photos must be 5 MB or smaller.',
          },
          'Photos must be 5 MB or smaller.'
        ),
      };
    }

    const contentType = inferMimeType(photoInput);

    if (!SUPPORTED_PHOTO_MIME_TYPES.has(contentType)) {
      return {
        data: null,
        error: toAppError(
          {
            message: 'Only JPG, PNG, and WEBP photos are supported.',
          },
          'Only JPG, PNG, and WEBP photos are supported.'
        ),
      };
    }

    const storagePath = buildPhotoStoragePath(userId, bathroomId, photoInput);
    const fileBuffer = await readPhotoArrayBuffer(photoInput);
    const { error: uploadError } = await getSupabaseClient().storage.from(BATHROOM_PHOTO_BUCKET).upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return {
        data: null,
        error: toAppError(uploadError, 'Unable to upload the selected bathroom photo.'),
      };
    }

    const photoInsert: BathroomPhotoInsert = {
      bathroom_id: bathroomId,
      uploaded_by: userId,
      storage_bucket: BATHROOM_PHOTO_BUCKET,
      storage_path: storagePath,
      content_type: contentType,
      file_size_bytes: photoInput.fileSize ?? null,
      width: photoInput.width ?? null,
      height: photoInput.height ?? null,
      is_primary: true,
    };

    const { data, error } = await getSupabaseClient()
      .from('bathroom_photos')
      .insert(photoInsert as never)
      .select('*')
      .maybeSingle();

    if (error) {
      await removeUploadedObject(storagePath);
      return {
        data: null,
        error: toAppError(error, 'The bathroom was saved, but the photo metadata could not be recorded.'),
      };
    }

    return {
      data: (data as DbBathroomPhoto | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to upload the selected bathroom photo.'),
        'Unable to upload the selected bathroom photo.'
      ),
    };
  }
}

export async function createBathroomSubmission(
  userId: string,
  bathroomInput: BathroomCreateInput
): Promise<BathroomSubmissionResponse> {
  try {
    const bathroomInsert: BathroomInsert = {
      place_name: bathroomInput.place_name.trim(),
      address_line1: normalizeOptionalText(bathroomInput.address_line1),
      city: normalizeOptionalText(bathroomInput.city),
      state: normalizeOptionalText(bathroomInput.state),
      postal_code: normalizeOptionalText(bathroomInput.postal_code),
      country_code: 'US',
      latitude: bathroomInput.latitude,
      longitude: bathroomInput.longitude,
      is_locked: bathroomInput.is_locked,
      is_accessible: bathroomInput.is_accessible,
      is_customer_only: bathroomInput.is_customer_only,
      source_type: 'community',
      moderation_status: 'active',
      created_by: userId,
    };

    const { data, error } = await getSupabaseClient()
      .from('bathrooms')
      .insert(bathroomInsert as never)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to add this bathroom right now.'),
        warning: null,
      };
    }

    const createdBathroom = (data as DbBathroom | null) ?? null;

    if (!createdBathroom) {
      return {
        data: null,
        error: toAppError(
          {
            message: 'The bathroom was saved, but no bathroom record was returned.',
          },
          'The bathroom was saved, but no bathroom record was returned.'
        ),
        warning: null,
      };
    }

    if (!bathroomInput.photo) {
      return {
        data: {
          bathroom: createdBathroom,
          photo: null,
        },
        error: null,
        warning: null,
      };
    }

    const photoResult = await uploadBathroomPhoto(userId, createdBathroom.id, bathroomInput.photo);

    return {
      data: {
        bathroom: createdBathroom,
        photo: photoResult.data,
      },
      error: null,
      warning: photoResult.error,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to add this bathroom right now.'),
        'Unable to add this bathroom right now.'
      ),
      warning: null,
    };
  }
}
