import { describe, expect, it } from '@jest/globals';
import { bathroomPhotoProofSchema } from '@/utils/validate';

describe('bathroomPhotoProofSchema', () => {
  it('accepts a valid keypad proof payload', () => {
    const result = bathroomPhotoProofSchema.safeParse({
      bathroom_id: 'bathroom-123',
      photo_type: 'keypad',
      photo: {
        uri: 'file:///tmp/keypad-proof.jpg',
        fileName: 'keypad-proof.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        width: 1200,
        height: 900,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported image formats', () => {
    const result = bathroomPhotoProofSchema.safeParse({
      bathroom_id: 'bathroom-123',
      photo_type: 'interior',
      photo: {
        uri: 'file:///tmp/interior-proof.gif',
        fileName: 'interior-proof.gif',
        mimeType: 'image/gif',
        fileSize: 1024,
      },
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Only JPG, PNG, and WEBP photos are supported.');
    }
  });
});
