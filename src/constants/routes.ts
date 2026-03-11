import { Href } from 'expo-router';

export const routes = {
  tabs: {
    map: '/(tabs)' as Href,
    search: '/(tabs)/search' as Href,
    favorites: '/(tabs)/favorites' as Href,
    profile: '/(tabs)/profile' as Href,
    business: '/(tabs)/business' as Href,
  },
  auth: {
    login: '/(auth)/login' as Href,
    register: '/(auth)/register' as Href,
  },
  bathroomDetail: (bathroomId: string) => `/bathroom/${bathroomId}` as Href,
} as const;
