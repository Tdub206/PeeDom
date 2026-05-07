import {
  buildCkanDatasetPageUrl,
  parseCkanRestroomGeoJson,
  scoreCkanDatasetRelevance,
  selectBestCkanGeoJsonResource,
  type CkanPortalConfig,
} from '@/lib/import/ckan-public-restrooms';

describe('ckan public restroom connector', () => {
  const portal: CkanPortalConfig = {
    key: 'smartdublin',
    name: 'Smart Dublin',
    apiBaseUrl: 'https://data.smartdublin.ie',
    portalUrl: 'https://data.smartdublin.ie',
    countryCode: 'IE',
  };

  const dataset = {
    id: '8ec3d217-855c-435d-9953-715b194c11c7',
    title: 'Public Toilets DCC',
    name: 'public-toilets-dcc',
    notes: 'Dataset of Dublin City Council public toilets.',
    url: 'https://data.smartdublin.ie/dataset/public-toilets-dcc',
    author: 'Dublin City Council',
    license_id: 'CC-BY-4.0',
    license_title: 'Creative Commons Attribution 4.0',
    metadata_modified: '2025-09-19T13:53:13.222182',
    updated: '2025-06-19',
    organization: {
      title: 'Dublin City Council',
    },
    tags: [
      { name: 'bathroom' },
      { name: 'toilets' },
    ],
    resources: [
      {
        id: '8796f653-4517-495a-b8b5-cb47157deaac',
        name: 'CSV',
        format: 'CSV',
        url: 'https://data.smartdublin.ie/resource/public-toilets-dcc.csv',
      },
      {
        id: 'ff83c414-a99b-43d5-a3ac-90292a5b1aba',
        name: 'Public Toilets DCC',
        format: 'GeoJSON',
        description: 'Location of public toilets in Dublin city',
        download_url:
          'https://data.smartdublin.ie/dataset/8ec3d217-855c-435d-9953-715b194c11c7/resource/ff83c414-a99b-43d5-a3ac-90292a5b1aba/download/public-toilets-dcc-2021.geojson',
        url: 'https://data.smartdublin.ie/resource/public-toilets-dcc.geojson',
      },
    ],
  };

  it('selects geojson resources and scores restroom datasets highly', () => {
    expect(selectBestCkanGeoJsonResource(dataset)?.id).toBe('ff83c414-a99b-43d5-a3ac-90292a5b1aba');
    expect(scoreCkanDatasetRelevance(dataset)).toBeGreaterThanOrEqual(12);
    expect(buildCkanDatasetPageUrl(portal, dataset)).toBe(
      'https://data.smartdublin.ie/dataset/public-toilets-dcc'
    );
  });

  it('parses ckan geojson resources into stallpass records', () => {
    const resource = selectBestCkanGeoJsonResource(dataset);

    expect(resource).not.toBeNull();

    const fixture = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 1,
          geometry: {
            type: 'Point',
            coordinates: [-6.267207103, 53.34433879],
          },
          properties: {
            Location: 'City Hall, Dame Street, Dublin 2',
            'Opening Hours': '10am to 5pm Monday to Sunday',
          },
        },
      ],
    });

    const result = parseCkanRestroomGeoJson(fixture, portal, dataset, resource!);

    expect(result.summary.included_records).toBe(1);
    expect(result.records[0]).toMatchObject({
      place_name: 'City Hall, Dame Street, Dublin 2 Restroom',
      country_code: 'IE',
    });
    expect(result.records[0]?.archetype_metadata).toMatchObject({
      import_source: 'ckan-open-data',
      source_license_key: 'CC-BY-4.0',
      source_portal_key: 'smartdublin',
    });
  });
});
