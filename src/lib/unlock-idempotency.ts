function randomSegment(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 12);
}

export function createUnlockIdempotencyKey(scope: string): string {
  const normalizedScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 80);
  return `${normalizedScope}:${Date.now().toString(36)}:${randomSegment()}`.slice(0, 128);
}
