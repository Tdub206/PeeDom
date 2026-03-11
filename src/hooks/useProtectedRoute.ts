import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { pushSafely, replaceSafely } from '@/lib/navigation';
import { routes } from '@/constants/routes';
import { IntentType, ReplayStrategy } from '@/types';

interface UseProtectedRouteOptions {
  requireAuth?: boolean;
  intentType?: IntentType;
  intentParams?: Record<string, unknown>;
  replayStrategy?: ReplayStrategy;
}

/**
 * Hook to protect routes and handle return-to-intent flow
 * 
 * @example
 * // In a screen that requires authentication:
 * useProtectedRoute({ requireAuth: true });
 * 
 * @example
 * // For a specific protected action:
 * const handleFavorite = () => {
 *   const canProceed = useProtectedRoute({
 *     requireAuth: true,
 *     intentType: 'favorite_toggle',
 *     intentParams: { bathroom_id: '123' },
 *   });
 *   
 *   if (canProceed) {
 *     // Execute favorite action
 *   }
 * };
 */
export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { requireAuth = false, intentType, intentParams, replayStrategy = 'immediate_after_auth' } = options;
  const {
    canAccessProtectedRoute,
    isAuthenticated,
    loading,
    requireAuth: requireAuthenticatedUser,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (requireAuth && !isAuthenticated) {
      requireAuthenticatedUser(
        intentType && intentParams
          ? {
              type: intentType,
              route: pathname,
              params: intentParams,
              replay_strategy: replayStrategy,
            }
          : undefined
      );
      replaceSafely(router, routes.auth.login, routes.auth.login);
    }
  }, [
    intentParams,
    intentType,
    isAuthenticated,
    loading,
    pathname,
    replayStrategy,
    requireAuth,
    requireAuthenticatedUser,
    router,
  ]);

  return {
    canAccess: canAccessProtectedRoute,
    isLoading: loading,
  };
}

/**
 * Hook to check if user can perform a protected action
 * Returns a function that handles the auth check and intent setting
 * 
 * @example
 * const checkProtectedAction = useProtectedAction();
 * 
 * const handleFavorite = () => {
 *   const canProceed = checkProtectedAction({
 *     intentType: 'favorite_toggle',
 *     intentParams: { bathroom_id: '123' },
 *   });
 *   
 *   if (canProceed) {
 *     // Execute action
 *   }
 * };
 */
export function useProtectedAction() {
  const { isAuthenticated, loading, requireAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (options: {
    intentType: IntentType;
    intentParams: Record<string, unknown>;
    replayStrategy?: ReplayStrategy;
  }): boolean => {
    if (loading) return false;

    if (!isAuthenticated) {
      requireAuth({
        type: options.intentType,
        route: pathname,
        params: options.intentParams,
        replay_strategy: options.replayStrategy || 'immediate_after_auth',
      });

      pushSafely(router, routes.auth.login, routes.auth.login);
      return false;
    }

    return true;
  };
}
