import { useLocationContext } from '@/contexts/LocationContext';

export function useLocation() {
  return useLocationContext();
}
