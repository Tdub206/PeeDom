const unstableReactLegacyComponentNames = [
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
];

module.exports = {
  project: {
    android: {
      unstable_reactLegacyComponentNames: unstableReactLegacyComponentNames,
    },
    ios: {
      unstable_reactLegacyComponentNames: unstableReactLegacyComponentNames,
    },
  },
};
