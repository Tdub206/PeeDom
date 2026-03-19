import { describe, expect, it } from '@jest/globals';

import {
  addBathroomSchema,
  bathroomPhotoSchema,
  claimBusinessSchema,
  cleanlinessRatingSchema,
  codeSubmitSchema,
  getFieldErrors,
  liveStatusReportSchema,
  loginSchema,
  registerSchema,
  reportCreateSchema,
} from '@/utils/validate';

describe('loginSchema', () => {
  it('trims a valid email address during parsing', () => {
    const result = loginSchema.parse({
      email: '  rider@example.com  ',
      password: 'password123',
    });

    expect(result.email).toBe('rider@example.com');
  });

  it('maps invalid login input to field-level errors', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'short',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected login validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      email: 'Email is required.',
      password: 'Password must be at least 8 characters long.',
    });
  });
});

describe('registerSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'rider@example.com',
      password: 'password123',
      confirmPassword: 'different123',
      displayName: 'Rider',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected registration validation to fail for mismatched passwords.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      confirmPassword: 'Passwords do not match.',
    });
  });
});

describe('reportCreateSchema', () => {
  it('accepts valid report payloads', () => {
    const result = reportCreateSchema.parse({
      bathroom_id: 'bathroom-123',
      report_type: 'closed',
      notes: 'Closed after 9pm.',
    });

    expect(result.report_type).toBe('closed');
  });

  it('rejects empty bathroom ids and long notes', () => {
    const result = reportCreateSchema.safeParse({
      bathroom_id: '',
      report_type: 'other',
      notes: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected report validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      notes: 'Report details must be 500 characters or fewer.',
    });
  });
});

describe('codeSubmitSchema', () => {
  it('accepts valid access code submissions', () => {
    const result = codeSubmitSchema.parse({
      bathroom_id: 'bathroom-123',
      code_value: '  1234#  ',
    });

    expect(result.code_value).toBe('1234#');
  });

  it('rejects missing bathroom ids and invalid code characters', () => {
    const result = codeSubmitSchema.safeParse({
      bathroom_id: '',
      code_value: '!',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected code submission validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      code_value: 'Access code must be at least 2 characters long.',
    });
  });
});

describe('cleanlinessRatingSchema', () => {
  it('accepts valid cleanliness ratings', () => {
    const result = cleanlinessRatingSchema.parse({
      bathroom_id: 'bathroom-123',
      rating: 4,
      notes: 'Clean but missing paper towels.',
    });

    expect(result.rating).toBe(4);
    expect(result.notes).toBe('Clean but missing paper towels.');
  });

  it('rejects missing bathroom ids and out-of-range ratings', () => {
    const result = cleanlinessRatingSchema.safeParse({
      bathroom_id: '',
      rating: 6,
      notes: 'a'.repeat(301),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected cleanliness rating validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      rating: 'Choose a cleanliness rating between 1 and 5.',
      notes: 'Cleanliness notes must be 300 characters or fewer.',
    });
  });
});

describe('liveStatusReportSchema', () => {
  it('accepts valid live status updates', () => {
    const result = liveStatusReportSchema.parse({
      bathroom_id: 'bathroom-123',
      status: 'long_wait',
      note: 'Line wrapped around the hallway.',
    });

    expect(result.status).toBe('long_wait');
    expect(result.note).toBe('Line wrapped around the hallway.');
  });

  it('rejects missing bathroom ids, invalid statuses, and long notes', () => {
    const result = liveStatusReportSchema.safeParse({
      bathroom_id: '',
      status: 'broken',
      note: 'a'.repeat(281),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected live status validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      status: 'Choose the live status you want to share.',
      note: 'Live status notes must be 280 characters or fewer.',
    });
  });
});

describe('addBathroomSchema', () => {
  it('accepts valid bathroom submissions', () => {
    const result = addBathroomSchema.parse({
      place_name: 'Union Station',
      address_line1: '401 S Jackson St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98104',
      latitude: '47.5984',
      longitude: '-122.3295',
      is_locked: false,
      is_accessible: true,
      is_customer_only: false,
    });

    expect(result.place_name).toBe('Union Station');
    expect(result.latitude).toBeCloseTo(47.5984);
  });

  it('requires address detail and valid coordinates', () => {
    const result = addBathroomSchema.safeParse({
      place_name: 'A',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '98104',
      latitude: '200',
      longitude: '-190',
      is_locked: false,
      is_accessible: true,
      is_customer_only: false,
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected bathroom validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      place_name: 'Bathroom name must be at least 2 characters long.',
      latitude: 'Latitude must be between -90 and 90.',
      longitude: 'Longitude must be between -180 and 180.',
      address_line1: 'Add at least a street address or city details.',
    });
  });
});

describe('bathroomPhotoSchema', () => {
  it('accepts supported image uploads', () => {
    const result = bathroomPhotoSchema.parse({
      uri: 'file:///bathroom-photo.jpg',
      fileName: 'bathroom-photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 400000,
    });

    expect(result.mimeType).toBe('image/jpeg');
  });

  it('rejects oversized or unsupported images', () => {
    const result = bathroomPhotoSchema.safeParse({
      uri: 'file:///bathroom-photo.gif',
      fileName: 'bathroom-photo.gif',
      mimeType: 'image/gif',
      fileSize: 6 * 1024 * 1024,
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected photo validation to fail for unsupported input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      fileSize: 'Photos must be 5 MB or smaller.',
      mimeType: 'Only JPG, PNG, and WEBP photos are supported.',
    });
  });
});

describe('claimBusinessSchema', () => {
  it('accepts valid business claim submissions', () => {
    const result = claimBusinessSchema.parse({
      bathroom_id: 'bathroom-123',
      business_name: 'Central Cafe',
      contact_email: ' owner@example.com ',
      contact_phone: '(206) 555-0199',
      evidence_url: 'https://example.com/team',
    });

    expect(result.contact_email).toBe('owner@example.com');
    expect(result.business_name).toBe('Central Cafe');
  });

  it('rejects invalid business claim contact data', () => {
    const result = claimBusinessSchema.safeParse({
      bathroom_id: '',
      business_name: 'A',
      contact_email: 'not-an-email',
      contact_phone: '12',
      evidence_url: 'not-a-url',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected claim validation to fail for invalid contact data.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      business_name: 'Business name must be at least 2 characters long.',
      contact_email: 'Enter a valid contact email address.',
      contact_phone: 'Enter a valid phone number.',
      evidence_url: 'Enter a valid URL.',
    });
  });
});
