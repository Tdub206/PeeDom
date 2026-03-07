import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { returnIntent } from '@/lib/return-intent';
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
  const { isAuthenticated, loading, canAccessProtectedRoute } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      // Get current route
      const currentRoute = '/' + segments.join('/');
      
      // Save return intent if specified
      if (intentType && intentParams) {
        returnIntent.set({
          type: intentType,
          route: currentRoute,
          params: intentParams,
          replay_strategy: replayStrategy,
        });
      }

      // Redirect to login
      router.replace('/(auth)/login');
    }
  }, [requireAuth, isAuthenticated, loading, segments, intentType, intentParams, replayStrategy, router]);

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
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  return (options: {
    intentType: IntentType;
    intentParams: Record<string, unknown>;
    replayStrategy?: ReplayStrategy;
  }): boolean => {
    if (loading) return false;

    if (!isAuthenticated) {
      const currentRoute = '/' + segments.join('/');
      
      returnIntent.set({
        type: options.intentType,
        route: currentRoute,
        params: options.intentParams,
        replay_strategy: options.replayStrategy || 'immediate_after_auth',
      });

      router.push('/(auth)/login');
      return false;
    }

    return true;
  };
}
