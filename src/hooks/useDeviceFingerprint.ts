/**
 * Produces a stable, per-install device fingerprint hash used by the
 * anti-sybil layer. The hash is FNV-1a 64-bit (non-cryptographic but
 * deterministic, collision-acceptable for abuse signals), computed over:
 *
 *   Device.modelName | Device.osVersion | Application.applicationId |
 *   Constants.easBuildId | installId
 *
 * installId is generated once and persisted in SecureStore so reinstalls
 * produce a different fingerprint (a feature, not a bug — it helps surface
 * device-collision sybils).
 */

import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const INSTALL_ID_KEY = 'stallpass.device_install_id.v1';

function fnv1a64(value: string): string {
  // FNV-1a 64-bit implemented with two 32-bit halves to stay within safe integers.
  let hashHi = 0xcbf29ce4;
  let hashLo = 0x84222325;
  for (let i = 0; i < value.length; i += 1) {
    const byte = value.charCodeAt(i) & 0xff;
    hashLo ^= byte;

    // 64-bit multiply by FNV prime (0x100000001b3) split across halves.
    // prime = 0x100 * 2^32 + 0x000001b3
    const primeHi = 0x00000100;
    const primeLo = 0x000001b3;

    const lo = Math.imul(hashLo, primeLo) >>> 0;
    const mid1 = Math.imul(hashLo, primeHi) >>> 0;
    const mid2 = Math.imul(hashHi, primeLo) >>> 0;

    const carry = Math.floor(
      (Math.imul(hashLo & 0xffff, primeLo) >>> 0) / 0x100000000
    );
    const newLo = lo;
    const newHi = (mid1 + mid2 + carry + (hashHi * primeLo & 0)) >>> 0;

    hashHi = newHi >>> 0;
    hashLo = newLo >>> 0;
  }
  return (
    hashHi.toString(16).padStart(8, '0') + hashLo.toString(16).padStart(8, '0')
  );
}

function generateInstallId(): string {
  const randomSegments: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    randomSegments.push(Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'));
  }
  return `${Date.now().toString(36)}-${randomSegments.join('')}`;
}

async function resolveInstallId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }
    const created = generateInstallId();
    await SecureStore.setItemAsync(INSTALL_ID_KEY, created);
    return created;
  } catch {
    // SecureStore can fail on web / headless envs — fall back to in-memory id.
    return generateInstallId();
  }
}

function resolveApplicationId(): string {
  const expoConfig = Constants.expoConfig;
  const manifest = (Constants as unknown as { manifest?: Record<string, unknown> | null }).manifest;
  const candidate =
    expoConfig?.android?.package ??
    expoConfig?.ios?.bundleIdentifier ??
    ((expoConfig?.slug as string | undefined) || null) ??
    (manifest?.slug as string | null | undefined) ??
    'stallpass-unknown';
  return typeof candidate === 'string' ? candidate : 'stallpass-unknown';
}

function resolveBuildId(): string {
  const fromEas = Constants.easConfig?.projectId ?? null;
  const fromRuntime = Constants.expoConfig?.runtimeVersion ?? null;
  const resolved = fromEas ?? fromRuntime ?? 'build-unknown';
  return typeof resolved === 'string' ? resolved : 'build-unknown';
}

async function computeFingerprint(): Promise<string> {
  const installId = await resolveInstallId();
  const raw = [
    Device.modelName ?? 'model-unknown',
    Device.osVersion ?? 'os-unknown',
    Device.osName ?? 'platform-unknown',
    resolveApplicationId(),
    resolveBuildId(),
    installId,
  ].join('|');
  return fnv1a64(raw);
}

export interface DeviceFingerprintState {
  fingerprint: string | null;
  loading: boolean;
  error: Error | null;
}

export function useDeviceFingerprint(): DeviceFingerprintState {
  const [state, setState] = useState<DeviceFingerprintState>({
    fingerprint: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    computeFingerprint()
      .then((fingerprint) => {
        if (!mountedRef.current) return;
        setState({ fingerprint, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setState({
          fingerprint: null,
          loading: false,
          error: err instanceof Error ? err : new Error('Unable to compute device fingerprint.'),
        });
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return state;
}
