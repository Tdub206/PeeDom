import { parseSeattleParksGeoJson, parseSeattleParksHours } from '@/lib/import/public-restroom-import';

describe('public restroom import parsing', () => {
  it('parses only open public active Seattle park restrooms', () => {
    const fixture = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 1,
          geometry: {
            type: 'Point',
            coordinates: [-122.31, 47.63],
          },
          properties: {
            OBJECTID: 1,
            PARK: 'Volunteer Park',
            ALT_NAME: 'Volunteer Park Restroom',
            DESCRIPTION: 'VOLUNTEER PARK RESTROOM',
            AMWOID: 'RESTROOM-VOLUNTEER',
            LIFECYCLESTATUSTXT: 'A',
            OPENTOPUBLIC: 'YES',
            CURRENTSTATUS: 'OPEN',
            HOURS: '9AM - 5PM',
            DAILYLOCKSTATUS: 'UNLOCKED',
            SEASON: 'YEAR ROUND',
          },
        },
        {
          type: 'Feature',
          id: 2,
          geometry: {
            type: 'Point',
            coordinates: [-122.32, 47.64],
          },
          properties: {
            OBJECTID: 2,
            PARK: 'Closed Park',
            ALT_NAME: 'Closed Park Restroom',
            DESCRIPTION: 'CLOSED PARK RESTROOM',
            AMWOID: 'RESTROOM-CLOSED',
            LIFECYCLESTATUSTXT: 'A',
            OPENTOPUBLIC: 'YES',
            CURRENTSTATUS: 'CLOSED',
            HOURS: '9AM - 5PM',
          },
        },
        {
          type: 'Feature',
          id: 3,
          geometry: {
            type: 'Point',
            coordinates: [-122.33, 47.65],
          },
          properties: {
            OBJECTID: 3,
            PARK: 'Private Park',
            ALT_NAME: 'Private Park Restroom',
            DESCRIPTION: 'PRIVATE PARK RESTROOM',
            AMWOID: 'RESTROOM-PRIVATE',
            LIFECYCLESTATUSTXT: 'A',
            OPENTOPUBLIC: 'NO',
            CURRENTSTATUS: 'OPEN',
          },
        },
      ],
    });

    const result = parseSeattleParksGeoJson(fixture);

    expect(result.summary.total_features).toBe(3);
    expect(result.summary.included_records).toBe(1);
    expect(result.summary.skip_counts.not_open).toBe(1);
    expect(result.summary.skip_counts.not_public).toBe(1);
    expect(result.records[0]).toMatchObject({
      external_source_id: 'RESTROOM-VOLUNTEER',
      place_name: 'Volunteer Park Restroom',
      city: 'Seattle',
      state: 'WA',
      country_code: 'US',
      is_locked: false,
      source_type: 'imported',
      access_type: 'public',
      location_archetype: 'park',
    });
    expect(result.records[0]?.hours_json?.monday).toEqual([{ open: '09:00', close: '17:00' }]);
  });

  it('treats park hours and split close times as ambiguous', () => {
    expect(parseSeattleParksHours('PARK HOURS')).toEqual({
      hours: null,
      ambiguous: true,
    });

    expect(parseSeattleParksHours('7AM - 7/9PM')).toEqual({
      hours: null,
      ambiguous: true,
    });
  });
});
