import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const nearbyBathroomsPanelSource = readFileSync(
  path.join(process.cwd(), 'src', 'components', 'NearbyBathroomsPanel.tsx'),
  'utf8'
);

describe('nearby bathrooms panel contract', () => {
  it('starts collapsed so the home tab exposes the map on first load', () => {
    expect(nearbyBathroomsPanelSource).toContain('const [isExpanded, setIsExpanded] = useState(false);');
  });
});
