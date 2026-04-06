import { describe, expect, it } from '@jest/globals';

import type { AdminClaimListItem, FeaturedRequestListItem } from '@/api/admin';
import {
  assessClaimModerationRisk,
  assessFeaturedRequestPriority,
  formatFeaturedScope,
  summarizeAdminQueue,
} from '@/utils/admin-moderation';

const highRiskClaim: AdminClaimListItem = {
  claim_id: 'claim-1',
  bathroom_id: 'bathroom-1',
  claimant_user_id: 'user-1',
  business_name: 'Blue Harbor Holdings',
  contact_email: 'owner@gmail.com',
  contact_phone: null,
  evidence_url: null,
  review_status: 'pending',
  created_at: '2026-03-20T10:00:00.000Z',
  place_name: 'Downtown Transit Restroom',
  address: '123 Main St Seattle WA',
  claimant_display_name: null,
  claimant_email: null,
};

const lowRiskClaim: AdminClaimListItem = {
  ...highRiskClaim,
  claim_id: 'claim-2',
  business_name: 'Downtown Transit',
  contact_email: 'ops@downtowntransit.com',
  contact_phone: '555-0100',
  evidence_url: 'https://www.downtowntransit.com/team',
  claimant_display_name: 'Jordan',
  claimant_email: 'ops@downtowntransit.com',
};

const featuredRequest: FeaturedRequestListItem = {
  id: 'request-1',
  bathroom_id: 'bathroom-1',
  business_user_id: 'user-1',
  placement_type: 'map_priority',
  geographic_scope: {},
  requested_duration_days: 120,
  status: 'pending',
  admin_notes: null,
  created_at: '2026-04-01T10:00:00.000Z',
  place_name: undefined,
  business_name: undefined,
  requester_display_name: undefined,
};

describe('admin moderation utilities', () => {
  it('flags weak claims with higher moderation risk', () => {
    const assessment = assessClaimModerationRisk(highRiskClaim);

    expect(assessment.priority).toBe('high');
    expect(assessment.score).toBeGreaterThanOrEqual(45);
    expect(assessment.signals.some((signal) => signal.label.includes('No evidence'))).toBe(true);
  });

  it('downgrades claims with aligned evidence and contact signals', () => {
    const assessment = assessClaimModerationRisk(lowRiskClaim);

    expect(assessment.priority).toBe('low');
    expect(assessment.signals.some((signal) => signal.label.includes('Evidence attached'))).toBe(true);
    expect(assessment.signals.some((signal) => signal.label.includes('aligns'))).toBe(true);
  });

  it('formats featured scope and prioritizes weak featured requests', () => {
    expect(formatFeaturedScope({ city: 'Seattle', state: 'WA', radius_km: 3 })).toBe('Seattle, WA within 3 km');

    const assessment = assessFeaturedRequestPriority(featuredRequest);

    expect(assessment.priority).toBe('high');
    expect(assessment.signals.some((signal) => signal.label.includes('Scope needs clarification'))).toBe(true);
  });

  it('summarizes queue counts for admin triage', () => {
    const summary = summarizeAdminQueue(
      [highRiskClaim, { ...lowRiskClaim, review_status: 'approved' }],
      [featuredRequest]
    );

    expect(summary.pending_claims).toBe(1);
    expect(summary.high_risk_claims).toBe(1);
    expect(summary.claims_missing_evidence).toBe(1);
    expect(summary.pending_featured_requests).toBe(1);
    expect(summary.high_priority_featured_requests).toBe(1);
  });
});
