import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

describe('route bathrooms loading state', () => {
  it('shows route geometry loading before route results exist', () => {
    const source = readFileSync(path.join(process.cwd(), 'app/modal/route-bathrooms.tsx'), 'utf8');

    expect(source).toContain('{isSearching ? (');
    expect(source).toContain('Calculating route geometry...');
    expect(source).not.toContain('{isSearching && routeGeometry ? (');
  });
});
