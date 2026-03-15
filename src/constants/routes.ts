import { Href } from 'expo-router';

export const routes = {
  tabs: {
    map: '/' as Href,
    search: '/search' as Href,
    favorites: '/favorites' as Href,
    profile: '/profile' as Href,
  },
  auth: {
    login: '/login' as Href,
    register: '/register' as Href,
  },
  legal: {
    privacy: '/legal/privacy' as Href,
    accountDeletion: '/legal/account-deletion' as Href,
  },
  modal: {
    addBathroom: '/modal/add-bathroom' as Href,
    addBathroomDraft: (draftId: string) =>
      ({
        pathname: '/modal/add-bathroom',
        params: {
          draft_id: draftId,
        },
      }) as Href,
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
