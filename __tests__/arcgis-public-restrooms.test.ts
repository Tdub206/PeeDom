import {
  hasArcGisStructuralRestroomSignal,
  hasArcGisLayerRestroomSignal,
  parseArcGisRestroomGeoJson,
  scoreArcGisItemRelevance,
  scoreArcGisLayerRelevance,
} from '@/lib/import/arcgis-public-restrooms';

describe('arcgis public restroom discovery helpers', () => {
  it('scores restroom-specific ArcGIS items and layers above noisy assets', () => {
    const restroomItemScore = scoreArcGisItemRelevance({
      id: 'item-1',
      title: 'Public Restroom Locations',
      type: 'Feature Service',
      access: 'public',
      url: 'https://example.com/FeatureServer',
      owner: 'city-gis',
      snippet: 'Public restroom facilities across city parks.',
      description: 'Citywide restroom inventory.',
      tags: ['restrooms', 'parks'],
      typeKeywords: ['Feature Service'],
      accessInformation: 'City GIS',
      licenseInfo: '',
      modified: 1,
    });
    const noisyItemScore = scoreArcGisItemRelevance({
      id: 'item-2',
      title: 'Parcel Boundaries',
      type: 'Feature Service',
      access: 'public',
      url: 'https://example.com/FeatureServer',
      owner: 'county-gis',
      snippet: 'Parcel polygons.',
      description: 'Assessor parcel dataset.',
      tags: ['parcel'],
      typeKeywords: ['Feature Service'],
      accessInformation: 'County GIS',
      licenseInfo: '',
      modified: 1,
    });

    expect(restroomItemScore).toBeGreaterThan(noisyItemScore);

    const layerScore = scoreArcGisLayerRelevance({
      item: {
        id: 'item-1',
        title: 'Park Buildings',
        type: 'Feature Service',
        access: 'public',
        url: 'https://example.com/FeatureServer',
        owner: 'city-gis',
        snippet: 'Park structures including restrooms.',
        description: 'Restroom inventory',
        tags: ['restrooms'],
        typeKeywords: ['Feature Service'],
        accessInformation: 'City GIS',
        licenseInfo: '',
        modified: 1,
      },
      layer: {
        id: 14,
        name: 'Buildings_PRD',
        description: 'Includes restrooms and shade structures.',
        geometryType: 'esriGeometryPolygon',
        displayField: 'FacilityName',
        objectIdField: 'OBJECTID',
        fields: [
          { name: 'FacilityName', alias: 'FacilityName' },
          { name: 'Type', alias: 'Type' },
        ],
      },
      sampleFeatures: [
        {
          attributes: {
            OBJECTID: 1,
            Type: 'Restroom',
            FacilityName: 'All American Restroom #2',
          },
        },
      ],
    });

    expect(layerScore).toBeGreaterThanOrEqual(6);
    expect(
      hasArcGisStructuralRestroomSignal(
        {
          id: 'item-1',
          title: 'Park Buildings',
          type: 'Feature Service',
          access: 'public',
          url: 'https://example.com/FeatureServer',
          owner: 'city-gis',
          snippet: 'Park structures including restrooms.',
          description: 'Restroom inventory',
          tags: ['restrooms'],
          typeKeywords: ['Feature Service'],
          accessInformation: 'City GIS',
          licenseInfo: '',
          modified: 1,
        },
        {
          id: 14,
          name: 'Buildings_PRD',
          description: 'Includes restrooms and shade structures.',
          geometryType: 'esriGeometryPolygon',
          displayField: 'FacilityName',
          objectIdField: 'OBJECTID',
          fields: [
            { name: 'FacilityName', alias: 'FacilityName' },
            { name: 'Type', alias: 'Type' },
          ],
        }
      )
    ).toBe(true);
    expect(
      hasArcGisLayerRestroomSignal({
        id: 1,
        name: 'CADI_Baseline_Priority_Zones',
        description: 'Census tract priority zones.',
        geometryType: 'esriGeometryPolygon',
        displayField: 'Name',
        objectIdField: 'OBJECTID',
        fields: [{ name: 'Name', alias: 'Name' }],
      })
    ).toBe(false);
  });

  it('parses ArcGIS GeoJSON and skips non-restroom assets', () => {
    const fixture = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 14890,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-115.2, 36.1],
                [-115.199, 36.1],
                [-115.199, 36.101],
                [-115.2, 36.101],
                [-115.2, 36.1],
              ],
            ],
          },
          properties: {
            OBJECTID: 14890,
            Label: 'Restroom #2',
            Type: 'Restroom',
            Location: 'All American Park',
            ParkName: 'All American',
            FacilityName: 'All American - Restroom #2',
            FacilityAddress: '1551 S Buffalo Dr',
            Longitude: -115.205,
            Latitude: 36.1015,
            ADA: 'Yes',
            Status: 'Open',
          },
        },
        {
          type: 'Feature',
          id: 14891,
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-115.3, 36.2],
                [-115.299, 36.2],
                [-115.299, 36.201],
                [-115.3, 36.201],
                [-115.3, 36.2],
              ],
            ],
          },
          properties: {
            OBJECTID: 14891,
            Label: 'Pump Station',
            Type: 'Pump Station',
            Location: 'Bill Briare Family Park',
            FacilityName: 'Bill Briare - Pump Station',
            Status: 'Open',
          },
        },
      ],
    });

    const result = parseArcGisRestroomGeoJson(fixture, {
      sourceItemId: '6b61dad1b7cf442194e22c2738e66d3e',
      sourceItemTitle: 'Park Buildings',
      sourceItemOwner: 'OfficeOfGIS_LasVegas',
      sourceLayerId: 14,
      sourceLayerName: 'Buildings_PRD',
      sourceServiceUrl: 'https://services1.arcgis.com/F1v0ufATbBQScMtY/arcgis/rest/services/Buildings_PRD/FeatureServer/14',
      sourceItemUrl: 'https://www.arcgis.com/home/item.html?id=6b61dad1b7cf442194e22c2738e66d3e',
      sourceAccessInformation: 'City of Las Vegas GIS',
      sourceLicenseInfo: 'Public reference only',
      sourceDescription: 'Park structures',
      sourceLayerDescription: 'Includes restrooms and shade structures',
      sourceDownloadUrl: 'https://services1.arcgis.com/F1v0ufATbBQScMtY/arcgis/rest/services/Buildings_PRD/FeatureServer/14',
    });

    expect(result.summary.total_features).toBe(2);
    expect(result.summary.included_records).toBe(1);
    expect(result.summary.skip_counts.not_restroom).toBe(1);
    expect(result.records[0]).toMatchObject({
      external_source_id: '6b61dad1b7cf442194e22c2738e66d3e:14:14890',
      place_name: 'All American - Restroom #2',
      address_line1: '1551 S Buffalo Dr',
      access_type: 'public',
      location_archetype: 'park',
      is_accessible: true,
      latitude: 36.1015,
      longitude: -115.205,
    });
    expect(result.records[0]?.archetype_metadata.import_source).toBe('arcgis-open-data');
  });
});
