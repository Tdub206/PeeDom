import {
  buildSocrataDatasetPageUrl,
  parseSocrataRestroomGeoJson,
  scoreSocrataDatasetRelevance,
} from '@/lib/import/socrata-public-restrooms';

describe('socrata public restroom connector', () => {
  const dataset = {
    resource: {
      name: 'Public Restrooms',
      id: 'i7jb-7jku',
      description: 'Public restroom availability across New York City.',
      attribution: 'NYC Parks',
      attribution_link: 'https://on.nyc.gov/restrooms',
      updatedAt: '2025-11-05T20:39:42.000Z',
      data_updated_at: '2025-06-27T13:37:10.000Z',
      columns_name: ['Facility Name', 'Hours of Operation', 'Accessibility', 'Status'],
      columns_field_name: ['facility_name', 'hours_of_operation', 'accessibility', 'status'],
      columns_datatype: ['Text', 'Text', 'Text', 'Text'],
      provenance: 'official',
      download_count: 6506,
    },
    classification: {
      domain_category: 'City Government',
      domain_tags: ['public restrooms'],
      domain_metadata: [
        {
          key: 'Dataset-Information_Agency',
          value: "Mayor's Office of Operations (OPS)",
        },
      ],
    },
    metadata: {
      domain: 'data.cityofnewyork.us',
      license: 'Open Data',
    },
    permalink: 'https://data.cityofnewyork.us/d/i7jb-7jku',
    link: 'https://data.cityofnewyork.us/City-Government/Public-Restrooms/i7jb-7jku',
    owner: {
      display_name: 'NYC OpenData',
    },
  };

  it('scores official restroom datasets above noisy data', () => {
    expect(scoreSocrataDatasetRelevance(dataset)).toBeGreaterThanOrEqual(12);
    expect(buildSocrataDatasetPageUrl(dataset)).toBe(
      'https://data.cityofnewyork.us/City-Government/Public-Restrooms/i7jb-7jku'
    );
  });

  it('parses socrata geojson into stallpass records with source provenance', () => {
    const fixture = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-73.945, 40.77358],
          },
          properties: {
            facility_name: 'Carl Schurz Main Lawn',
            hours_of_operation: '6 AM - 10 PM',
            accessibility: 'Yes',
            status: 'Operational',
            location_type: 'Park',
          },
        },
      ],
    });

    const result = parseSocrataRestroomGeoJson(fixture, dataset);

    expect(result.summary.included_records).toBe(1);
    expect(result.records[0]).toMatchObject({
      place_name: 'Carl Schurz Main Lawn Restroom',
      location_archetype: 'park',
      is_accessible: true,
    });
    expect(result.records[0]?.archetype_metadata).toMatchObject({
      import_source: 'socrata-open-data',
      source_domain: 'data.cityofnewyork.us',
      source_dataset_id: 'i7jb-7jku',
    });
  });
});
