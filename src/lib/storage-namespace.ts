export const STALLPASS_STORAGE_NAMESPACE = '@stallpass/';

const PREVIOUS_STORAGE_NAMESPACE = `@${['pee', 'dom'].join('')}/`;

export function getPreviousStorageKey(key: string): string | null {
  if (!key.startsWith(STALLPASS_STORAGE_NAMESPACE)) {
    return null;
  }

  return `${PREVIOUS_STORAGE_NAMESPACE}${key.slice(STALLPASS_STORAGE_NAMESPACE.length)}`;
}

export function getCurrentStorageKey(key: string): string | null {
  if (!key.startsWith(PREVIOUS_STORAGE_NAMESPACE)) {
    return null;
  }

  return `${STALLPASS_STORAGE_NAMESPACE}${key.slice(PREVIOUS_STORAGE_NAMESPACE.length)}`;
}

export function isManagedStorageKey(key: string): boolean {
  return key.startsWith(STALLPASS_STORAGE_NAMESPACE) || key.startsWith(PREVIOUS_STORAGE_NAMESPACE);
}
