import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const mapViewSource = readFileSync(path.join(process.cwd(), 'src', 'components', 'MapView.tsx'), 'utf8');
const appConfigSource = readFileSync(path.join(process.cwd(), 'app.config.ts'), 'utf8');

describe('iOS map rendering contract', () => {
  it('keeps Google Maps provider wired only for the Android map surface', () => {
    expect(mapViewSource).toContain('provider={PROVIDER_GOOGLE}');

    const iosClusterBlock = mapViewSource.match(/<ClusteredMapView[\s\S]*?<\/ClusteredMapView>/);

    expect(iosClusterBlock?.[0]).toBeDefined();
    expect(iosClusterBlock?.[0]).not.toContain('provider={PROVIDER_GOOGLE}');
  });

  it('does not require an iOS Google Maps build key in Expo config', () => {
    expect(appConfigSource).not.toContain('IOS_GOOGLE_MAPS_API_KEY');
    expect(appConfigSource).not.toContain('googleMapsApiKey');
  });
});
