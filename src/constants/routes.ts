import { Href } from 'expo-router';
import type { ReportType } from '@/types';

export const routes = {
  tabs: {
    map: '/' as Href,
    search: '/search' as Href,
    favorites: '/favorites' as Href,
    profile: '/profile' as Href,
    business: '/business' as Href,
    admin: '/admin' as Href,
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
    updateAccessibility: '/modal/update-accessibility' as Href,
    updateAccessibilityBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/update-accessibility',
        params: {
          bathroom_id: bathroomId,
        },
      }) as unknown as Href,
    updateAccessibilityDraft: (bathroomId: string, draftId: string) =>
      ({
        pathname: '/modal/update-accessibility',
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
    reportUser: '/modal/report-user' as Href,
    reportUserTarget: (userId: string, displayName?: string) =>
      ({
        pathname: '/modal/report-user',
        params: {
          user_id: userId,
          ...(displayName ? { display_name: displayName } : {}),
        },
      }) as Href,
    legal: '/modal/legal' as Href,
    legalPrivacy: {
      pathname: '/modal/legal',
      params: { tab: 'privacy' },
    } as Href,
    legalTerms: {
      pathname: '/modal/legal',
      params: { tab: 'terms' },
    } as Href,
    routeBathrooms: '/modal/route-bathrooms' as Href,
    cityPacks: '/modal/city-packs' as Href,
    requestFeatured: '/modal/request-featured' as Href,
    requestFeaturedBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/request-featured',
        params: { bathroom_id: bathroomId },
      }) as unknown as Href,
    createCoupon: '/modal/create-coupon' as Href,
    createCouponBathroom: (bathroomId: string) =>
      ({
        pathname: '/modal/create-coupon',
        params: { bathroom_id: bathroomId },
      }) as unknown as Href,
    earlyAdopterInvite: '/modal/early-adopter-invite' as Href,
    redeemInvite: '/modal/redeem-invite' as Href,
  },
  legal: {
    privacy: '/legal/privacy' as Href,
    accountDeletion: '/legal/account-deletion' as Href,
  },
  bathroomDetail: (bathroomId: string) => `/bathroom/${bathroomId}` as Href,
} as const;
