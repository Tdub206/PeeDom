import { buildBusinessAiSystemPrompt } from '../apps/business-web/src/lib/business/business-ai';
import {
  buildBathroomPhotoStoragePath,
  sanitizeBathroomPhotoFileName,
} from '../apps/business-web/src/lib/business/photo-storage';
import { businessAiRequestSchema } from '../apps/business-web/src/lib/business/schemas';

describe('business web photo helpers', () => {
  it('sanitizes uploaded file names before building storage paths', () => {
    expect(sanitizeBathroomPhotoFileName(' front door (1).png ')).toBe('front_door_1_.png');
    expect(buildBathroomPhotoStoragePath('bathroom-123', 'front door (1).png', 42)).toBe(
      'bathroom-123/42-front_door_1_.png'
    );
  });

  it('falls back to a safe default name when the original is empty', () => {
    expect(sanitizeBathroomPhotoFileName('   ')).toBe('photo');
  });
});

describe('business web ai validation', () => {
  it('trims request payloads and requires the final message to come from the user', () => {
    const parsed = businessAiRequestSchema.parse({
      messages: [{ role: 'user', content: '  Help me write a reply.  ' }],
      businessContext: '  One managed location  ',
    });

    expect(parsed).toEqual({
      messages: [{ role: 'user', content: 'Help me write a reply.' }],
      businessContext: 'One managed location',
    });

    expect(() =>
      businessAiRequestSchema.parse({
        messages: [{ role: 'assistant', content: 'Here is a draft.' }],
      })
    ).toThrow('Last message must come from the user.');
  });

  it('builds the AI system prompt with injected business context', () => {
    const prompt = buildBusinessAiSystemPrompt('Location: Main Street Cafe');

    expect(prompt).toContain('Current account context:');
    expect(prompt).toContain('Location: Main Street Cafe');
  });
});
