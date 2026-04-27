'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import {
  BATHROOM_PHOTO_ACCEPT,
  MAX_BATHROOM_PHOTO_BYTES,
  MAX_BATHROOM_PHOTO_MB,
} from '@/lib/business/photo-storage';
import { deleteBathroomPhoto, uploadBathroomPhoto } from './photo-actions';

interface ExistingPhoto {
  id: string;
  storage_path: string;
  url: string;
  moderation_status: 'approved' | 'pending' | 'rejected';
}

interface PhotoUploadFormProps {
  bathroomId: string;
  initialPhotos: ExistingPhoto[];
}

interface UploadEntry {
  localId: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'error';
  errorMsg?: string;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export function PhotoUploadForm({ bathroomId, initialPhotos }: PhotoUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [persisted, setPersisted] = useState<ExistingPhoto[]>(initialPhotos);
  const [isDragging, setIsDragging] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<UploadEntry[]>([]);

  useEffect(() => {
    setPersisted(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((entry) => {
        URL.revokeObjectURL(entry.previewUrl);
      });
    };
  }, []);

  const updateEntry = useCallback((localId: string, patch: Partial<UploadEntry>) => {
    setUploads((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry))
    );
  }, []);

  const dismissUpload = useCallback((localId: string) => {
    setUploads((current) => {
      const entry = current.find((candidate) => candidate.localId === localId);
      if (entry) {
        URL.revokeObjectURL(entry.previewUrl);
      }

      return current.filter((candidate) => candidate.localId !== localId);
    });
  }, []);

  const applyBatchMessage = useCallback(
    (successCount: number, failureCount: number, skippedCount: number, firstError: string | null) => {
      if (successCount > 0) {
        setSaveState('success');

        const details: string[] = [`Uploaded ${successCount} photo${successCount === 1 ? '' : 's'}.`];
        if (failureCount > 0) {
          details.push(`${failureCount} upload${failureCount === 1 ? '' : 's'} failed.`);
        }
        if (skippedCount > 0) {
          details.push(`${skippedCount} file${skippedCount === 1 ? ' was' : 's were'} skipped.`);
        }
        if (failureCount === 0) {
          details.push('Photos stay hidden until moderation review is complete.');
        } else if (firstError) {
          details.push(firstError);
        }

        setMessage(details.join(' '));
        return;
      }

      setSaveState('error');
      setMessage(firstError ?? 'No photos were uploaded. Try again with a valid image.');
    },
    []
  );

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || isPending) {
        return;
      }

      const candidateFiles = Array.from(fileList);
      const queuedEntries: UploadEntry[] = [];
      let skippedCount = 0;
      let firstError: string | null = null;

      candidateFiles.forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
          skippedCount += 1;
          firstError ??= `"${file.name}" is not an image file.`;
          return;
        }

        if (file.size > MAX_BATHROOM_PHOTO_BYTES) {
          skippedCount += 1;
          firstError ??= `"${file.name}" is larger than ${MAX_BATHROOM_PHOTO_MB} MB.`;
          return;
        }

        queuedEntries.push({
          localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'uploading',
        });
      });

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      if (queuedEntries.length === 0) {
        setSaveState('error');
        setMessage(firstError ?? 'Select at least one image to upload.');
        return;
      }

      setUploads((current) => [...current, ...queuedEntries]);
      setSaveState('saving');
      setMessage(
        queuedEntries.length === 1
          ? 'Uploading 1 photo...'
          : `Uploading ${queuedEntries.length} photos...`
      );

      startTransition(async () => {
        let successCount = 0;
        let failureCount = 0;
        let batchError = firstError;

        for (const entry of queuedEntries) {
          const formData = new FormData();
          formData.append('bathroom_id', bathroomId);
          formData.append('file', entry.file);

          const result = await uploadBathroomPhoto(formData);

          if (!result.ok) {
            failureCount += 1;
            batchError ??= result.error;
            updateEntry(entry.localId, { status: 'error', errorMsg: result.error });
            continue;
          }

          successCount += 1;
          setPersisted((current) => [result.photo, ...current]);
          dismissUpload(entry.localId);
        }

        applyBatchMessage(successCount, failureCount, skippedCount, batchError);

        if (successCount > 0) {
          router.refresh();
        }
      });
    },
    [applyBatchMessage, bathroomId, dismissUpload, isPending, router, updateEntry]
  );

  const handleDeletePersisted = useCallback(
    (photo: ExistingPhoto) => {
      if (isPending) {
        return;
      }

      setSaveState('saving');
      setMessage('Removing photo...');

      startTransition(async () => {
        const result = await deleteBathroomPhoto(bathroomId, photo.id);

        if (!result.ok) {
          setSaveState('error');
          setMessage(result.error);
          return;
        }

        setPersisted((current) => current.filter((candidate) => candidate.id !== photo.id));
        setSaveState('success');
        setMessage('Photo removed.');
        router.refresh();
      });
    },
    [bathroomId, isPending, router]
  );

  return (
    <div className="grid gap-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isPending) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => {
          if (!isPending) {
            inputRef.current?.click();
          }
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition ${
          isPending
            ? 'cursor-wait border-surface-strong bg-surface-base'
            : isDragging
              ? 'cursor-pointer border-brand-400 bg-brand-50'
              : 'cursor-pointer border-surface-strong bg-surface-base hover:border-brand-300 hover:bg-brand-50/40'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <ImagePlus size={22} />
        </div>
        <div>
          <div className="text-sm font-bold text-ink-900">Drop images here or click to browse</div>
          <div className="mt-1 text-xs text-ink-500">
            JPEG, PNG, WebP, or GIF. Max {MAX_BATHROOM_PHOTO_MB} MB each.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={BATHROOM_PHOTO_ACCEPT}
          multiple
          className="hidden"
          disabled={isPending}
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {message ? (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
            saveState === 'success'
              ? 'border-success/20 bg-success/10 text-success'
              : saveState === 'error'
                ? 'border-danger/20 bg-danger/10 text-danger'
                : 'border-brand-200 bg-brand-50 text-brand-700'
          }`}
        >
          {saveState === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 flex-none" />
          ) : saveState === 'error' ? (
            <AlertTriangle size={16} className="mt-0.5 flex-none" />
          ) : (
            <Loader2 size={16} className="mt-0.5 flex-none animate-spin" />
          )}
          <span className="leading-6">{message}</span>
        </div>
      ) : null}

      {uploads.length > 0 ? (
        <div className="grid gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
            Upload queue
          </div>
          <div className="flex flex-wrap gap-3">
            {uploads.map((entry) => (
              <div key={entry.localId} className="relative h-24 w-24 flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.previewUrl}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 px-2">
                  {entry.status === 'uploading' ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <span className="text-center text-[10px] font-bold text-white">
                      {entry.errorMsg ?? 'Upload failed.'}
                    </span>
                  )}
                </div>
                {entry.status === 'error' ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      dismissUpload(entry.localId);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                    aria-label="Dismiss failed upload"
                  >
                    <X size={10} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {persisted.length > 0 ? (
        <div className="grid gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
            Photos ({persisted.length})
          </div>
          <div className="flex flex-wrap gap-3">
            {persisted.map((photo) => (
              <div key={photo.id} className="group relative h-24 w-24 flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
                {photo.moderation_status === 'pending' ? (
                  <div className="absolute bottom-1 left-1 right-1 rounded-xl bg-black/60 px-1 py-0.5 text-center text-[9px] font-bold uppercase text-white/80">
                    Review
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDeletePersisted(photo)}
                  disabled={isPending}
                  className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow group-hover:flex disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Delete photo"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
