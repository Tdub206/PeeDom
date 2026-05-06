import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const ADMOB_VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
const CRYPTO_ALGORITHM = {
  name: 'ECDSA',
  hash: 'SHA-256',
} as const;

interface AdMobVerifierKey {
  keyId?: number | string;
  key_id?: number | string;
  base64?: string;
  pem?: string;
}

interface AdMobVerifierKeyResponse {
  keys?: AdMobVerifierKey[];
}

interface RewardTokenContext {
  featureKey: 'code_reveal' | 'emergency_lookup';
  bathroomId: string | null;
}

let cachedKeys: {
  expiresAt: number;
  keys: Map<number, CryptoKey>;
} | null = null;

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseAllowedAdUnits(): string[] {
  return (Deno.env.get('ADMOB_REWARDED_AD_UNIT_IDS') ?? Deno.env.get('EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return `${normalized}${'='.repeat(paddingLength)}`;
}

function decodeBase64Url(value: string): Uint8Array {
  return Uint8Array.from(atob(normalizeBase64Url(value)), (character) => character.charCodeAt(0));
}

function extractPemBody(pem: string): string {
  return pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
}

function derLengthBytes(length: number): number[] {
  if (length < 128) {
    return [length];
  }

  const bytes: number[] = [];
  let remainingLength = length;

  while (remainingLength > 0) {
    bytes.unshift(remainingLength & 0xff);
    remainingLength >>= 8;
  }

  return [0x80 | bytes.length, ...bytes];
}

function readDerLength(bytes: Uint8Array, offset: number): { length: number; offset: number } {
  const firstByte = bytes[offset];

  if (typeof firstByte !== 'number') {
    throw new Error('Invalid DER length.');
  }

  if ((firstByte & 0x80) === 0) {
    return {
      length: firstByte,
      offset: offset + 1,
    };
  }

  const byteCount = firstByte & 0x7f;
  let length = 0;

  for (let index = 0; index < byteCount; index += 1) {
    const nextByte = bytes[offset + 1 + index];

    if (typeof nextByte !== 'number') {
      throw new Error('Invalid DER long-form length.');
    }

    length = (length << 8) | nextByte;
  }

  return {
    length,
    offset: offset + 1 + byteCount,
  };
}

function normalizeIntegerBytes(bytes: Uint8Array): Uint8Array {
  let start = 0;

  while (start < bytes.length - 1 && bytes[start] === 0) {
    start += 1;
  }

  const trimmed = bytes.slice(start);

  if (trimmed.length > 32) {
    return trimmed.slice(trimmed.length - 32);
  }

  if (trimmed.length === 32) {
    return trimmed;
  }

  const output = new Uint8Array(32);
  output.set(trimmed, 32 - trimmed.length);
  return output;
}

function convertDerEcdsaSignatureToRaw(derSignature: Uint8Array): Uint8Array {
  let offset = 0;

  if (derSignature[offset] !== 0x30) {
    throw new Error('Invalid ECDSA signature sequence.');
  }

  const sequenceLength = readDerLength(derSignature, offset + 1);
  offset = sequenceLength.offset;

  if (offset + sequenceLength.length !== derSignature.length) {
    throw new Error('Invalid ECDSA signature length.');
  }

  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid ECDSA R integer.');
  }

  const rLength = readDerLength(derSignature, offset + 1);
  const rStart = rLength.offset;
  const rBytes = derSignature.slice(rStart, rStart + rLength.length);
  offset = rStart + rLength.length;

  if (derSignature[offset] !== 0x02) {
    throw new Error('Invalid ECDSA S integer.');
  }

  const sLength = readDerLength(derSignature, offset + 1);
  const sStart = sLength.offset;
  const sBytes = derSignature.slice(sStart, sStart + sLength.length);

  const output = new Uint8Array(64);
  output.set(normalizeIntegerBytes(rBytes), 0);
  output.set(normalizeIntegerBytes(sBytes), 32);
  return output;
}

function buildDerEcdsaSignatureFromRaw(rawSignature: Uint8Array): Uint8Array {
  if (rawSignature.length !== 64) {
    throw new Error('Expected a raw P-256 signature.');
  }

  const encodeInteger = (bytes: Uint8Array): number[] => {
    let start = 0;

    while (start < bytes.length - 1 && bytes[start] === 0) {
      start += 1;
    }

    const trimmed = Array.from(bytes.slice(start));
    const needsPositivePadding = (trimmed[0] ?? 0) >= 0x80;
    const integerBytes = needsPositivePadding ? [0, ...trimmed] : trimmed;

    return [0x02, ...derLengthBytes(integerBytes.length), ...integerBytes];
  };

  const r = encodeInteger(rawSignature.slice(0, 32));
  const s = encodeInteger(rawSignature.slice(32));
  const sequence = [...r, ...s];

  return new Uint8Array([0x30, ...derLengthBytes(sequence.length), ...sequence]);
}

function extractKeyId(key: AdMobVerifierKey): number | null {
  const rawKeyId = key.keyId ?? key.key_id;
  const keyId = typeof rawKeyId === 'number' ? rawKeyId : Number.parseInt(String(rawKeyId ?? ''), 10);
  return Number.isInteger(keyId) ? keyId : null;
}

function extractKeyMaterial(key: AdMobVerifierKey): string | null {
  const base64 = key.base64?.trim();

  if (base64) {
    return base64;
  }

  const pem = key.pem?.trim();
  return pem ? extractPemBody(pem) : null;
}

async function importVerifierKey(keyMaterial: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    decodeBase64Url(keyMaterial),
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['verify']
  );
}

async function fetchVerifierKeys(nowMs: number = Date.now()): Promise<Map<number, CryptoKey>> {
  if (cachedKeys && cachedKeys.expiresAt > nowMs) {
    return cachedKeys.keys;
  }

  const response = await fetch(ADMOB_VERIFIER_KEYS_URL);

  if (!response.ok) {
    throw new Error(`Unable to fetch AdMob verifier keys: ${response.status}`);
  }

  const payload = (await response.json()) as AdMobVerifierKeyResponse;
  const keys = new Map<number, CryptoKey>();

  for (const key of payload.keys ?? []) {
    const keyId = extractKeyId(key);
    const keyMaterial = extractKeyMaterial(key);

    if (keyId !== null && keyMaterial) {
      keys.set(keyId, await importVerifierKey(keyMaterial));
    }
  }

  if (keys.size === 0) {
    throw new Error('AdMob verifier key response did not contain usable keys.');
  }

  cachedKeys = {
    keys,
    expiresAt: nowMs + 24 * 60 * 60 * 1000,
  };

  return keys;
}

function getContentToVerify(url: URL): Uint8Array {
  const queryString = url.search.length > 0 ? url.search.slice(1) : '';
  const signatureIndex = queryString.indexOf('&signature=');

  if (signatureIndex < 0) {
    throw new Error('Missing SSV signature query parameter.');
  }

  return new TextEncoder().encode(queryString.slice(0, signatureIndex));
}

async function verifyAdMobSignature(url: URL, params: URLSearchParams): Promise<void> {
  const signature = params.get('signature')?.trim() ?? '';
  const keyId = Number.parseInt(params.get('key_id') ?? '', 10);

  if (!signature || !Number.isInteger(keyId)) {
    throw new Error('Missing SSV signature or key id.');
  }

  const keys = await fetchVerifierKeys();
  const key = keys.get(keyId);

  if (!key) {
    throw new Error('No matching AdMob verifier key is available.');
  }

  const derSignature = decodeBase64Url(signature);
  const rawSignature = convertDerEcdsaSignatureToRaw(derSignature);
  const isVerified = await crypto.subtle.verify(CRYPTO_ALGORITHM, key, rawSignature, getContentToVerify(url));

  if (!isVerified) {
    throw new Error('Invalid AdMob SSV signature.');
  }
}

function parseRewardToken(customData: string): RewardTokenContext | null {
  const codeRevealMatch = /^cr_([a-f0-9]{32})_[a-f0-9]{16}$/i.exec(customData);

  if (codeRevealMatch) {
    const compactBathroomId = codeRevealMatch[1].toLowerCase();
    const bathroomId = [
      compactBathroomId.slice(0, 8),
      compactBathroomId.slice(8, 12),
      compactBathroomId.slice(12, 16),
      compactBathroomId.slice(16, 20),
      compactBathroomId.slice(20),
    ].join('-');

    return {
      featureKey: 'code_reveal',
      bathroomId,
    };
  }

  if (/^el_[a-z0-9]+_[a-f0-9]{16}$/i.test(customData)) {
    return {
      featureKey: 'emergency_lookup',
      bathroomId: null,
    };
  }

  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isAllowedAdUnit(adUnit: string, allowedAdUnits: string[]): boolean {
  if (allowedAdUnits.length === 0) {
    return true;
  }

  return allowedAdUnits.some((allowedAdUnit) => {
    const configuredSuffix = allowedAdUnit.includes('/') ? allowedAdUnit.split('/').pop() ?? '' : allowedAdUnit;
    return adUnit === allowedAdUnit || (configuredSuffix.length > 0 && adUnit === configuredSuffix);
  });
}

function isTimestampRecent(timestamp: string, nowMs: number = Date.now()): boolean {
  const timestampMs = Number.parseInt(timestamp, 10);

  if (!Number.isFinite(timestampMs)) {
    return false;
  }

  return Math.abs(nowMs - timestampMs) <= MAX_CLOCK_SKEW_MS;
}

function isUnsignedSetupVerificationProbe(params: URLSearchParams): boolean {
  return !params.get('signature')?.trim() || !params.get('key_id')?.trim();
}

function setupProbeResponse(reason: string): Response {
  return jsonResponse({
    success: true,
    ignored: true,
    reason,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const userId = params.get('user_id')?.trim() ?? '';
  const customData = params.get('custom_data')?.trim() ?? '';
  const rewardToken = parseRewardToken(customData);

  if (isUnsignedSetupVerificationProbe(params)) {
    return setupProbeResponse('Unsigned AdMob setup verification probe accepted without granting a reward.');
  }

  if (!isUuid(userId) || !rewardToken) {
    return setupProbeResponse('Non-StallPass AdMob setup verification probe accepted without granting a reward.');
  }

  try {
    await verifyAdMobSignature(requestUrl, params);
  } catch (error) {
    console.error('[admob-reward-ssv] signature verification failed:', error);
    return jsonResponse({ success: false, error: 'Invalid AdMob SSV signature.' }, 401);
  }

  const adUnit = params.get('ad_unit')?.trim() ?? '';
  const allowedAdUnits = parseAllowedAdUnits();

  if (!isAllowedAdUnit(adUnit, allowedAdUnits)) {
    return jsonResponse({ success: false, error: 'Ad unit is not allowed.' }, 403);
  }

  if (!isTimestampRecent(params.get('timestamp') ?? '')) {
    return jsonResponse({ success: false, error: 'Reward callback timestamp is outside the accepted window.' }, 400);
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.from('rewarded_unlock_verifications').insert({
      verification_token: customData,
      user_id: userId,
      feature_key: rewardToken.featureKey,
      bathroom_id: rewardToken.bathroomId,
      provider: 'admob',
      verified_at: new Date().toISOString(),
    });

    if (error && error.code !== '23505') {
      console.error('[admob-reward-ssv] unable to store reward verification:', error);
      return jsonResponse({ success: false, error: 'Unable to store reward verification.' }, 500);
    }

    return jsonResponse({
      success: true,
      duplicate: error?.code === '23505',
    });
  } catch (error) {
    console.error('[admob-reward-ssv] unexpected failure:', error);
    return jsonResponse({ success: false, error: 'Unexpected reward verification failure.' }, 500);
  }
});

export const __testExports = {
  buildDerEcdsaSignatureFromRaw,
  convertDerEcdsaSignatureToRaw,
  getContentToVerify,
  isAllowedAdUnit,
  isTimestampRecent,
  parseRewardToken,
};
