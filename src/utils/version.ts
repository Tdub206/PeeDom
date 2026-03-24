/**
 * Semver comparison utilities for app version checks.
 */

/** Parse "major.minor.patch" into a numeric tuple. Returns [0,0,0] on invalid input. */
function parseSemver(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  if (parts.length < 3 || parts.some((p) => !Number.isFinite(p))) {
    return [0, 0, 0];
  }
  return [parts[0], parts[1], parts[2]];
}

/** Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);

  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

/** True when `current` is older than `minimum`. */
export function isVersionBelowMinimum(current: string, minimum: string): boolean {
  return compareSemver(current, minimum) < 0;
}

/** True when `current` is older than `latest`. */
export function isUpdateAvailable(current: string, latest: string): boolean {
  return compareSemver(current, latest) < 0;
}
