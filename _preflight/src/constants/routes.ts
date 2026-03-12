import { Href } from 'expo-router';

export const routes = {
  tabs: {
    map: '/' as Href,
    search: '/search' as Href,
    favorites: '/favorites' as Href,
    profile: '/profile' as Href,
    business: '/business' as Href,
  },
  auth: {
    login: '/login' as Href,
    register: '/register' as Href,
  },
  modal: {
    report: '/modal/report' as Href,
    reportBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/report',
        params: {
          bathroom_id: bathroomId,
        },
      }) as Href,
  },
  bathroomDetail: (bathroomId: string) => `/bathroom/${bathroomId}` as Href,
} as const;
