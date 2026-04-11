import clsx, { type ClassValue } from 'clsx';

// Lightweight className joiner. We skip tailwind-merge on purpose —
// it's an extra ~30kb and we can discipline ourselves to not pile up
// conflicting utilities.
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
