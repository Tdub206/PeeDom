import {
  mergeImportedPublicBathroomParseResults,
  parseGovernmentOpenDataGeoJson,
} from '@/lib/import/government-open-data';

describe('government open data import helpers', () => {
  it('parses generic geojson datasets using dataset-level restroom signals and normalized field keys', () => {
    const fixture = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'row-1',
          geometry: {
            type: 'Point',
            coordinates: [-73.9835, 40.7537],
          },
          properties: {
            'Facility Name': 'Bryant Park',
            'Hours of Operation': '8 AM - 8 PM',
            Accessibility: 'Yes',
            Status: 'Operational',
            'Location Type': 'Park',
          },
        },
      ],
    });

    const result = parseGovernmentOpenDataGeoJson(fixture, {
      sourceKey: 'socrata-open-data',
      portalKey: 'socrata-data-cityofnewyork-us',
      portalName: 'data.cityofnewyork.us',
      portalUrl: 'https://data.cityofnewyork.us',
      queryMatchStrategy: 'socrata_catalog_search',
      sourceDatasetId: 'i7jb-7jku',
      sourceDataset: 'Public Restrooms',
      sourceDatasetUrl: 'https://data.cityofnewyork.us/City-Government/Public-Restrooms/i7jb-7jku',
      sourceOwner: 'NYC OpenData',
      sourceProvider: 'NYC Parks',
      sourceResourceId: 'i7jb-7jku:geojson',
      sourceResourceName: 'Public Restrooms GeoJSON',
      sourceResourceUrl: 'https://data.cityofnewyork.us/resource/i7jb-7jku.geojson',
      sourceResourceDownloadUrl: 'https://data.cityofnewyork.us/resource/i7jb-7jku.geojson',
      sourceAttributionText: 'NYC Parks',
      sourceLicenseText: null,
      sourceLicenseKey: null,
      sourceDescription: 'NYC public restroom directory',
      sourceResourceDescription: 'Socrata GeoJSON dataset resource',
      sourceUpdatedAt: '2025-06-27T13:37:10.000Z',
      countryCode: 'US',
    });

    expect(result.summary.included_records).toBe(1);
    expect(result.records[0]).toMatchObject({
      place_name: 'Bryant Park Restroom',
      country_code: 'US',
      is_accessible: true,
      location_archetype: 'park',
    });
    expect(result.records[0]?.archetype_metadata).toMatchObject({
      import_source: 'socrata-open-data',
      source_portal_key: 'socrata-data-cityofnewyork-us',
      source_dataset_id: 'i7jb-7jku',
      source_resource_id: 'i7jb-7jku:geojson',
      source_updated_at: '2025-06-27T13:37:10.000Z',
    });
  });

  it('merges multi-source parse results without duplicating dedupe keys', () => {
    const duplicatedResult = parseGovernmentOpenDataGeoJson(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'row-1',
            geometry: {
              type: 'Point',
              coordinates: [-6.267207103, 53.34433879],
            },
            properties: {
              Location: 'City Hall, Dame Street, Dublin 2',
            },
          },
        ],
      }),
      {
        sourceKey: 'ckan-open-data',
        portalKey: 'smartdublin',
        portalName: 'Smart Dublin',
        portalUrl: 'https://data.smartdublin.ie',
        queryMatchStrategy: 'ckan_package_search',
        sourceDatasetId: '8ec3d217-855c-435d-9953-715b194c11c7',
        sourceDataset: 'Public Toilets DCC',
        sourceDatasetUrl: 'https://data.smartdublin.ie/dataset/public-toilets-dcc',
        sourceOwner: 'Dublin City Council',
        sourceProvider: 'Dublin City Council',
        sourceResourceId: 'ff83c414-a99b-43d5-a3ac-90292a5b1aba',
        sourceResourceName: 'Public Toilets DCC GeoJSON',
        sourceResourceUrl:
          'https://data.smartdublin.ie/dataset/8ec3d217-855c-435d-9953-715b194c11c7/resource/ff83c414-a99b-43d5-a3ac-90292a5b1aba/download/public-toilets-dcc-2021.geojson',
        sourceResourceDownloadUrl:
          'https://data.smartdublin.ie/dataset/8ec3d217-855c-435d-9953-715b194c11c7/resource/ff83c414-a99b-43d5-a3ac-90292a5b1aba/download/public-toilets-dcc-2021.geojson',
        sourceAttributionText: 'Dublin City Council',
        sourceLicenseText: 'Creative Commons Attribution 4.0',
        sourceLicenseKey: 'CC-BY-4.0',
        sourceDescription: 'Public toilets in Dublin city',
        sourceResourceDescription: 'Location of public toilets in Dublin city',
        sourceUpdatedAt: '2025-06-19',
        countryCode: 'IE',
      }
    );
    const mergedResult = mergeImportedPublicBathroomParseResults([
      duplicatedResult,
      duplicatedResult,
    ]);

    expect(mergedResult.summary.included_records).toBe(1);
    expect(mergedResult.records[0]?.country_code).toBe('IE');
  });
});
