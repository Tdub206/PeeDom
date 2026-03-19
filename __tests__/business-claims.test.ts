import { describe, expect, it } from '@jest/globals';

import { Database, DbClaim } from '@/types';
import {
  formatBusinessClaimAddress,
  getBlockingBusinessClaim,
  hydrateBusinessClaimListItem,
  summarizeBusinessClaims,
} from '@/utils/business-claims';

type BathroomDetailRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

const baseClaim: DbClaim = {
  id: 'claim-1',
  bathroom_id: 'bathroom-1',
  claimant_user_id: 'user-1',
  business_name: 'Central Cafe',
  contact_email: 'owner@example.com',
  contact_phone: '(206) 555-0199',
  evidence_url: 'https://example.com/team',
  review_status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-03-15T12:00:00.000Z',
  updated_at: '2026-03-15T12:00:00.000Z',
};

const baseBathroom: BathroomDetailRow = {
  id: 'bathroom-1',
  place_name: 'Central Cafe Restroom',
  address_line1: '123 Pine Street',
  city: 'Seattle',
  state: 'WA',
  postal_code: '98101',
  country_code: 'US',
  latitude: 47.6101,
  longitude: -122.3364,
  is_locked: false,
  is_accessible: true,
  is_customer_only: false,
  accessibility_features: {
    has_grab_bars: false,
    door_width_inches: null,
    is_automatic_door: false,
    has_changing_table: false,
    is_family_restroom: false,
    is_gender_neutral: false,
    has_audio_cue: false,
  },
  hours_json: null,
  code_id: null,
  confidence_score: null,
  up_votes: null,
  down_votes: null,
  last_verified_at: null,
  expires_at: null,
  cleanliness_avg: null,
  updated_at: '2026-03-15T12:00:00.000Z',
};

describe('business claim utilities', () => {
  it('formats bathroom addresses for portal cards', () => {
    expect(formatBusinessClaimAddress(baseBathroom)).toBe('123 Pine Street Seattle, WA 98101 US');
    expect(formatBusinessClaimAddress(null)).toBe('Bathroom details unavailable');
  });

  it('hydrates claim items with bathroom summaries', () => {
    const hydratedClaim = hydrateBusinessClaimListItem(baseClaim, baseBathroom);

    expect(hydratedClaim.bathroom).toEqual({
      id: 'bathroom-1',
      place_name: 'Central Cafe Restroom',
      address: '123 Pine Street Seattle, WA 98101 US',
      is_locked: false,
      is_accessible: true,
      is_customer_only: false,
    });
  });

  it('summarizes claim counts by status', () => {
    const summary = summarizeBusinessClaims([
      baseClaim,
      {
        ...baseClaim,
        id: 'claim-2',
        review_status: 'approved',
      },
      {
        ...baseClaim,
        id: 'claim-3',
        review_status: 'rejected',
      },
    ]);

    expect(summary).toEqual({
      pending: 1,
      approved: 1,
      rejected: 1,
    });
  });

  it('blocks duplicate pending or approved claims for the same bathroom', () => {
    expect(
      getBlockingBusinessClaim(
        [
          {
            ...baseClaim,
            review_status: 'rejected',
          },
          {
            ...baseClaim,
            id: 'claim-4',
            review_status: 'approved',
          },
        ],
        'bathroom-1'
      )?.id
    ).toBe('claim-4');

    expect(
      getBlockingBusinessClaim(
        [
          {
            ...baseClaim,
            review_status: 'rejected',
          },
        ],
        'bathroom-1'
      )
    ).toBeNull();
  });
});
