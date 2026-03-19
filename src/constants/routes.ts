import { Href } from 'expo-router';
import type { ReportType } from '@/types';

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
    addBathroom: '/modal/add-bathroom' as Href,
    addBathroomDraft: (draftId: string) =>
      ({
        pathname: '/modal/add-bathroom',
        params: {
          draft_id: draftId,
        },
      }) as Href,
    report: '/modal/report' as Href,
    reportBathroom: (bathroomId: string, reportType?: ReportType) =>
      ({
        pathname: '/modal/report',
        params: {
          bathroom_id: bathroomId,
          ...(reportType ? { report_type: reportType } : {}),
        },
      }) as Href,
    submitCode: '/modal/submit-code' as Href,
    submitCodeBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/submit-code',
        params: {
          bathroom_id: bathroomId,
        },
      }) as unknown as Href,
    submitCodeDraft: (bathroomId: string, draftId: string) =>
      ({
        pathname: '/modal/submit-code',
        params: {
          bathroom_id: bathroomId,
          draft_id: draftId,
        },
      }) as unknown as Href,
    rateCleanliness: '/modal/rate-cleanliness' as Href,
    rateCleanlinessBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/rate-cleanliness',
        params: {
          bathroom_id: bathroomId,
        },
      }) as unknown as Href,
    rateCleanlinessDraft: (bathroomId: string, draftId: string) =>
      ({
        pathname: '/modal/rate-cleanliness',
        params: {
          bathroom_id: bathroomId,
          draft_id: draftId,
        },
      }) as unknown as Href,
    liveStatus: '/modal/live-status' as Href,
    liveStatusBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/live-status',
        params: {
          bathroom_id: bathroomId,
        },
      }) as unknown as Href,
    liveStatusDraft: (bathroomId: string, draftId: string) =>
      ({
        pathname: '/modal/live-status',
        params: {
          bathroom_id: bathroomId,
          draft_id: draftId,
        },
      }) as unknown as Href,
    claimBusiness: '/modal/claim-business' as Href,
    claimBusinessBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/claim-business',
        params: {
          bathroom_id: bathroomId,
        },
      }) as Href,
    claimBusinessDraft: (bathroomId: string, draftId: string) =>
      ({
        pathname: '/modal/claim-business',
        params: {
          bathroom_id: bathroomId,
          draft_id: draftId,
        },
      }) as Href,
  },
  bathroomDetail: (bathroomId: string) => `/bathroom/${bathroomId}` as Href,
} as const;
