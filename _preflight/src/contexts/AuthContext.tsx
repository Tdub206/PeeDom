/**
 * AuthContext.tsx — Compatibility Re-export
 *
 * Existing imports of `AuthProvider` and `useAuth` from this path continue to
 * work without modification. New code should import directly from:
 *   - AuthProvider: @/contexts/AuthProvider
 *   - useAuth:      @/hooks/useAuth
 *   - store selectors: @/store/useAuthStore
 */

export { AuthProvider } from './AuthProvider';
export { useAuth } from '@/hooks/useAuth';
