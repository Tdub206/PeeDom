import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const metroConfigSource = readFileSync(path.join(process.cwd(), 'metro.config.js'), 'utf8');

describe('metro config contract', () => {
  it('excludes the Android build tree from Metro crawling', () => {
    expect(metroConfigSource).toContain("'android'");
    expect(metroConfigSource).toContain('config.resolver.blockList');
  });
});
