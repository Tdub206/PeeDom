import { File as ExpoFile } from 'expo-file-system';
import { BathroomPhoto, BathroomPhotoProofCreateInput, DbBathroomPhoto } from '@/types';
import { dbBathroomPhotoSchema, parseSupabaseNullableRow, parseSupabaseRows } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import { bathroomPhotoProofSchema } from '@/utils/validate';

const BATHROOM_PHOTO_BUCKET = 'bathroom-photos';
const MAX_BATHROOM_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface AppErrorShape {
  code?: string;
  message: string;
}

interface BathroomPhotoFetchOptions {
  includeProtectedTypes?: boolean;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

function sanitizePathSegment(value: string): string {
  const sanitizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitizedValue || 'bathroom-photo';
}

function inferMimeType(fileName?: string | null, mimeType?: string | null): string {
  if (mimeType && SUPPORTED_PHOTO_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  const normalizedFileName = fileName?.toLowerCase() ?? '';

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

function buildPhotoStoragePath(
  userId: string,
  bathroomId: string,
  fileName: string | null | undefined,
  photoType: BathroomPhotoProofCreateInput['photo_type'],
  mimeType: string
): string {
  const safeFileName = sanitizePathSegment(fileName ?? `${photoType}-proof`);
  const fileExtension = inferFileExtension(mimeType);
  const fileToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${userId}/${bathroomId}/${photoType}/${safeFileName}-${fileToken}.${fileExtension}`;
}

async function readPhotoArrayBuffer(uri: string): Promise<ArrayBuffer> {
  try {
    return await new ExpoFile(uri).arrayBuffer();
  } catch (fileSystemError) {
    const response = await fetch(uri);

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
      console.error('Unable to remove an uploaded bathroom photo after a failed metadata write:', error);
    }
  } catch (error) {
    console.error('Unable to remove an uploaded bathroom photo after a failed metadata write:', error);
  }
}

function shouldSignProtectedPhoto(
  photoType: BathroomPhoto['photo_type'],
  includeProtectedTypes: boolean
): boolean {
  return includeProtectedTypes || (photoType !== 'keypad' && photoType !== 'sign');
}

async function buildBathroomPhotoUrl(
  photo: DbBathroomPhoto,
  includeProtectedTypes: boolean
): Promise<string> {
  if (!shouldSignProtectedPhoto(photo.photo_type, includeProtectedTypes)) {
    return '';
  }

  const { data, error } = await getSupabaseClient()
    .storage
    .from(photo.storage_bucket)
    .createSignedUrl(photo.storage_path, 60 * 60);

  if (error || !data?.signedUrl) {
    throw toAppError(error ?? new Error('Unable to sign the selected bathroom photo.'), 'Unable to load bathroom photo proof.');
  }

  return data.signedUrl;
}

async function mapBathroomPhotoRow(
  photo: DbBathroomPhoto,
  includeProtectedTypes: boolean
): Promise<BathroomPhoto> {
  const publicUrl = await buildBathroomPhotoUrl(photo, includeProtectedTypes);

  return {
    ...photo,
    public_url: publicUrl,
  };
}

export async function fetchBathroomPhotos(
  bathroomId: string,
  options?: BathroomPhotoFetchOptions
): Promise<{ data: BathroomPhoto[]; error: (Error & { code?: string }) | null }> {
  const includeProtectedTypes = Boolean(options?.includeProtectedTypes);

  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_photos')
      .select('*')
      .eq('bathroom_id', bathroomId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load photo proof for this bathroom.'),
      };
    }

    const parsedPhotos = parseSupabaseRows(
      dbBathroomPhotoSchema,
      data,
      'bathroom photo gallery',
      'Unable to load photo proof for this bathroom.'
    );

    if (parsedPhotos.error) {
      return {
        data: [],
        error: parsedPhotos.error,
      };
    }

    const mappedPhotos = await Promise.all(
      parsedPhotos.data.map((photo) => mapBathroomPhotoRow(photo, includeProtectedTypes))
    );

    return {
      data: mappedPhotos,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load photo proof for this bathroom.'),
        'Unable to load photo proof for this bathroom.'
      ),
    };
  }
}

export async function uploadBathroomPhotoProof(
  userId: string,
  input: BathroomPhotoProofCreateInput
): Promise<{ data: BathroomPhoto | null; error: (Error & { code?: string }) | null }> {
  const parsedInput = bathroomPhotoProofSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      data: null,
      error: toAppError(
        {
          message: parsedInput.error.issues[0]?.message || 'Photo proof validation failed.',
        },
        'Photo proof validation failed.'
      ),
    };
  }

  try {
    if (parsedInput.data.photo.fileSize && parsedInput.data.photo.fileSize > MAX_BATHROOM_PHOTO_SIZE_BYTES) {
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

    const contentType = inferMimeType(parsedInput.data.photo.fileName, parsedInput.data.photo.mimeType);

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

    const { count, error: countError } = await getSupabaseClient()
      .from('bathroom_photos')
      .select('id', { count: 'exact', head: true })
      .eq('bathroom_id', parsedInput.data.bathroom_id);

    if (countError) {
      return {
        data: null,
        error: toAppError(countError, 'Unable to prepare this photo proof upload.'),
      };
    }

    const storagePath = buildPhotoStoragePath(
      userId,
      parsedInput.data.bathroom_id,
      parsedInput.data.photo.fileName,
      parsedInput.data.photo_type,
      contentType
    );
    const fileBuffer = await readPhotoArrayBuffer(parsedInput.data.photo.uri);
    const { error: uploadError } = await getSupabaseClient().storage.from(BATHROOM_PHOTO_BUCKET).upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return {
        data: null,
        error: toAppError(uploadError, 'Unable to upload the selected photo proof.'),
      };
    }

    const { data, error } = await getSupabaseClient()
      .from('bathroom_photos')
      .insert({
        bathroom_id: parsedInput.data.bathroom_id,
        uploaded_by: userId,
        storage_bucket: BATHROOM_PHOTO_BUCKET,
        storage_path: storagePath,
        content_type: contentType,
        file_size_bytes: parsedInput.data.photo.fileSize ?? null,
        width: parsedInput.data.photo.width ?? null,
        height: parsedInput.data.photo.height ?? null,
        is_primary: !count,
        photo_type: parsedInput.data.photo_type,
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      await removeUploadedObject(storagePath);
      return {
        data: null,
        error: toAppError(error, 'The photo uploaded, but its metadata could not be recorded.'),
      };
    }

    const parsedPhoto = parseSupabaseNullableRow(
      dbBathroomPhotoSchema,
      data,
      'bathroom photo proof',
      'The photo uploaded, but its metadata could not be recorded.'
    );

    if (parsedPhoto.error || !parsedPhoto.data) {
      await removeUploadedObject(storagePath);
      return {
        data: null,
        error: parsedPhoto.error ?? toAppError(new Error('The photo metadata was empty.'), 'The photo metadata was empty.'),
      };
    }

    return {
      data: await mapBathroomPhotoRow(parsedPhoto.data, true),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to upload the selected photo proof.'),
        'Unable to upload the selected photo proof.'
      ),
    };
  }
}
