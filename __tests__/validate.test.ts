import { describe, expect, it } from '@jest/globals';

import {
  addBathroomSchema,
  bathroomPhotoSchema,
  getFieldErrors,
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
