import {
  parseOsmOpeningHours,
  parseOsmOverpassPublicRestrooms,
} from '@/lib/import/osm-overpass-public-restrooms';

describe('OSM Overpass public restroom import parsing', () => {
  it('parses canonical toilets tags and expanded restroom name matches', () => {
    const fixture = JSON.stringify({
      elements: [
        {
          type: 'node',
          id: 1,
          lat: 47.61,
          lon: -122.33,
          timestamp: '2026-04-19T01:00:00Z',
          tags: {
            amenity: 'toilets',
            access: 'yes',
            name: 'Waterfront Restroom',
            opening_hours: '24/7',
            wheelchair: 'yes',
            'toilets:unisex': 'yes',
          },
        },
        {
          type: 'way',
          id: 2,
          center: {
            lat: 47.62,
            lon: -122.34,
          },
          tags: {
            building: 'toilets',
            access: 'customers',
            'addr:housenumber': '100',
            'addr:street': 'Main St',
            'addr:city': 'Seattle',
          },
        },
        {
          type: 'node',
          id: 3,
          lat: 47.63,
          lon: -122.35,
          tags: {
            amenity: 'toilets',
            access: 'private',
            name: 'Staff Toilets',
          },
        },
        {
          type: 'node',
          id: 4,
          lat: 47.64,
          lon: -122.36,
          tags: {
            name: 'Boardwalk Restroom',
            access: 'yes',
            opening_hours: 'Mo-Su 09:00-17:00',
          },
        },
      ],
    });

    const result = parseOsmOverpassPublicRestrooms(fixture, {
      stateCode: 'WA',
      stateName: 'Washington',
      includeExpandedTextMatches: true,
    });

    expect(result.summary.total_features).toBe(4);
    expect(result.summary.included_records).toBe(3);
    expect(result.summary.skipped_records).toBe(1);
    expect(result.summary.skip_counts.not_public).toBe(1);
    expect(result.records[0]).toMatchObject({
      external_source_id: 'node/1',
      place_name: 'Waterfront Restroom',
      state: 'WA',
      country_code: 'US',
      is_accessible: true,
      access_type: 'public',
      location_archetype: 'general',
    });
    expect(result.records[0]?.hours_json?.monday).toEqual([{ open: '00:00', close: '23:59' }]);
    expect(result.records[0]?.accessibility_features.is_gender_neutral).toBe(true);
    expect(result.records[1]).toMatchObject({
      external_source_id: 'way/2',
      place_name: 'Public Restroom at 100 Main St',
      city: 'Seattle',
      access_type: 'purchase_required',
      is_customer_only: true,
    });
    expect(result.records[2]?.archetype_metadata.query_match_strategy).toBe('expanded_name_search');
  });

  it('parses simple OSM opening hours expressions', () => {
    expect(parseOsmOpeningHours('Mo-Fr 09:00-17:00; Sa 10:00-14:00; Su off')).toEqual({
      hours: {
        monday: [{ open: '09:00', close: '17:00' }],
        tuesday: [{ open: '09:00', close: '17:00' }],
        wednesday: [{ open: '09:00', close: '17:00' }],
        thursday: [{ open: '09:00', close: '17:00' }],
        friday: [{ open: '09:00', close: '17:00' }],
        saturday: [{ open: '10:00', close: '14:00' }],
        sunday: [],
      },
      ambiguous: false,
    });
  });
});
