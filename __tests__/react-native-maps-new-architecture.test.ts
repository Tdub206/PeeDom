import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const androidGradlePropertiesSource = readFileSync(path.join(process.cwd(), 'android', 'gradle.properties'), 'utf8');
const mapViewSource = readFileSync(path.join(process.cwd(), 'src', 'components', 'MapView.tsx'), 'utf8');
const reactNativeConfigSource = readFileSync(path.join(process.cwd(), 'react-native.config.js'), 'utf8');

describe('react-native-maps new architecture contract', () => {
  it('registers react-native-maps legacy component names when the new architecture is enabled', () => {
    expect(androidGradlePropertiesSource).toContain('newArchEnabled=true');
    expect(reactNativeConfigSource).toContain('unstable_reactLegacyComponentNames');

    [
      'AIRMap',
      'AIRMapCallout',
      'AIRMapCalloutSubview',
      'AIRMapCircle',
      'AIRMapHeatmap',
      'AIRMapLocalTile',
      'AIRMapMarker',
      'AIRMapOverlay',
      'AIRMapPolygon',
      'AIRMapPolyline',
      'AIRMapUrlTile',
      'AIRMapWMSTile',
    ].forEach((componentName) => {
      expect(reactNativeConfigSource).toContain(componentName);
    });
  });

  it('uses the latest Android renderer path without the native loading overlay', () => {
    const androidMapBlock = mapViewSource.match(/<NativeMapView[\s\S]*?<\/NativeMapView>/);

    expect(androidMapBlock?.[0]).toBeDefined();
    expect(androidMapBlock?.[0]).toContain('googleRenderer="LATEST"');
    expect(androidMapBlock?.[0]).toContain('mapType="standard"');
    expect(androidMapBlock?.[0]).not.toContain('googleRenderer="LEGACY"');
    expect(androidMapBlock?.[0]).not.toContain('loadingEnabled');
  });
});
