import { describe, expect, it, vi } from 'vitest';
import {
  computeAppealStats,
  computeSalesStats,
  escapeString,
  findLowerComps,
  findRecentSales,
  normalizeAddress,
  scoreSimilarity,
  searchProperty,
} from './api';

// --- escapeString ---

describe('escapeString', () => {
  it('escapes single quotes', () => {
    expect(escapeString("O'Brien")).toBe("O''Brien");
  });

  it('escapes backslashes', () => {
    expect(escapeString('a\\b')).toBe('a\\\\b');
  });

  it('handles both together', () => {
    expect(escapeString("a\\'b")).toBe("a\\\\''b");
  });

  it('passes through plain strings', () => {
    expect(escapeString('hello')).toBe('hello');
  });

  it('coerces numbers to strings', () => {
    expect(escapeString(123)).toBe('123');
  });
});

// --- normalizeAddress ---

describe('normalizeAddress', () => {
  it('uppercases and trims', () => {
    expect(normalizeAddress('  123 main  ')).toBe('123 MAIN');
  });

  it('abbreviates street types', () => {
    expect(normalizeAddress('123 Market Street')).toBe('123 MARKET ST');
    expect(normalizeAddress('456 Broad Avenue')).toBe('456 BROAD AVE');
    expect(normalizeAddress('789 Oak Boulevard')).toBe('789 OAK BLVD');
  });

  it('abbreviates directions', () => {
    expect(normalizeAddress('100 North Broad Street')).toBe('100 N BROAD ST');
    expect(normalizeAddress('200 South 5th Street')).toBe('200 S 5TH ST');
  });

  it('normalizes ordinals from words', () => {
    expect(normalizeAddress('100 First Street')).toBe('100 1ST ST');
    expect(normalizeAddress('200 Third Avenue')).toBe('200 3RD AVE');
    expect(normalizeAddress('300 Twelfth Street')).toBe('300 12TH ST');
  });

  it('normalizes numeric ordinals', () => {
    expect(normalizeAddress('100 2nd Street')).toBe('100 2ND ST');
    expect(normalizeAddress('100 13th Street')).toBe('100 13TH ST');
    expect(normalizeAddress('100 21st Street')).toBe('100 21ST ST');
  });

  it('does not apply ordinal to first token (house number)', () => {
    expect(normalizeAddress('1st Market Street')).toBe('1ST MARKET ST');
  });

  it('removes periods', () => {
    expect(normalizeAddress('100 N. Broad St.')).toBe('100 N BROAD ST');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeAddress('100   Market    Street')).toBe('100 MARKET ST');
  });

  it('handles special ordinal suffixes for 11th, 12th, 13th', () => {
    expect(normalizeAddress('100 11th Street')).toBe('100 11TH ST');
    expect(normalizeAddress('100 12th Street')).toBe('100 12TH ST');
    expect(normalizeAddress('100 13th Street')).toBe('100 13TH ST');
  });

  it('handles all direction variants', () => {
    expect(normalizeAddress('100 Northeast Blvd')).toBe('100 NE BLVD');
    expect(normalizeAddress('100 SW Drive')).toBe('100 SW DR');
  });
});

// --- scoreSimilarity ---

describe('scoreSimilarity', () => {
  const baseSubject = {
    number_of_bedrooms: 3,
    number_of_bathrooms: 2,
    total_livable_area: 1200,
    year_built: 1950,
    number_stories: 2,
    total_area: 1400,
    central_air: 'Y',
    basements: 'A',
    exterior_condition: '4',
  };

  it('returns 100 for identical properties at zero distance', () => {
    const comp = { ...baseSubject, distance_m: 0 };
    expect(scoreSimilarity(baseSubject, comp)).toBe(100);
  });

  it('returns lower score for different properties', () => {
    const comp = {
      number_of_bedrooms: 5,
      number_of_bathrooms: 4,
      total_livable_area: 3000,
      year_built: 2020,
      number_stories: 3,
      total_area: 4000,
      central_air: 'N',
      basements: '0',
      exterior_condition: '7',
      distance_m: 700,
    };
    const score = scoreSimilarity(baseSubject, comp);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(50);
  });

  it('returns 0 when no fields match and max score is 0', () => {
    expect(scoreSimilarity({}, {})).toBe(0);
  });

  it('gives proximity bonus for closer properties', () => {
    const close = { ...baseSubject, distance_m: 100 };
    const far = { ...baseSubject, distance_m: 750 };
    expect(scoreSimilarity(baseSubject, close)).toBeGreaterThan(
      scoreSimilarity(baseSubject, far)
    );
  });

  it('handles missing fields gracefully', () => {
    const comp = { distance_m: 400 };
    const score = scoreSimilarity(baseSubject, comp);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// --- computeSalesStats ---

describe('computeSalesStats', () => {
  const subject = { market_value: '300000' };

  it('computes correct stats', () => {
    const sales = [
      { sale_price: '250000' },
      { sale_price: '280000' },
      { sale_price: '320000' },
      { sale_price: '350000' },
    ];
    const stats = computeSalesStats(subject, sales);
    expect(stats.count).toBe(4);
    expect(stats.avg).toBe(300000);
    expect(stats.median).toBe(320000);
    expect(stats.subjectValue).toBe(300000);
    expect(stats.belowAssessment).toBe(2);
    expect(stats.pctBelow).toBe(50);
  });

  it('returns null for empty sales', () => {
    expect(computeSalesStats(subject, [])).toBeNull();
  });

  it('returns null when all prices are invalid', () => {
    const sales = [{ sale_price: 'N/A' }, { sale_price: '' }];
    expect(computeSalesStats(subject, sales)).toBeNull();
  });

  it('filters out zero and NaN prices', () => {
    const sales = [
      { sale_price: '200000' },
      { sale_price: '0' },
      { sale_price: 'bad' },
    ];
    const stats = computeSalesStats(subject, sales);
    expect(stats.count).toBe(1);
    expect(stats.avg).toBe(200000);
  });

  it('handles subject with no market value', () => {
    const stats = computeSalesStats({}, [{ sale_price: '100000' }]);
    expect(stats.subjectValue).toBe(0);
    expect(stats.belowAssessment).toBe(0);
  });
});

// --- computeAppealStats ---

describe('computeAppealStats', () => {
  const subject = { market_value: '400000' };

  it('computes correct stats', () => {
    const comps = [
      { market_value: '300000' },
      { market_value: '350000' },
      { market_value: '320000' },
    ];
    const stats = computeAppealStats(subject, comps);
    expect(stats.count).toBe(3);
    expect(stats.avg).toBe(323333);
    expect(stats.median).toBe(320000);
    expect(stats.overAssessment).toBe(400000 - 323333);
    expect(stats.subjectValue).toBe(400000);
  });

  it('returns null for empty comps', () => {
    expect(computeAppealStats(subject, [])).toBeNull();
  });

  it('returns null when all values are invalid', () => {
    const comps = [{ market_value: 'bad' }, { market_value: '0' }];
    expect(computeAppealStats(subject, comps)).toBeNull();
  });

  it('handles negative over-assessment (subject below avg)', () => {
    const lowSubject = { market_value: '100000' };
    const comps = [{ market_value: '200000' }, { market_value: '300000' }];
    const stats = computeAppealStats(lowSubject, comps);
    expect(stats.overAssessment).toBeLessThan(0);
    expect(stats.overPct).toBeLessThan(0);
  });
});

// --- searchProperty (fetch mocked) ---

describe('searchProperty', () => {
  it('returns rows on success', async () => {
    const mockRows = [{ parcel_number: '123', location: '100 MAIN ST' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: mockRows }),
    }));

    const results = await searchProperty('100 main st');
    expect(results).toEqual(mockRows);
    vi.unstubAllGlobals();
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(searchProperty('bad')).rejects.toThrow('Failed to search');
    vi.unstubAllGlobals();
  });

  it('throws on query error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: ['syntax error'] }),
    }));
    await expect(searchProperty('bad')).rejects.toThrow('syntax error');
    vi.unstubAllGlobals();
  });

  it('returns empty array when no rows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));
    const results = await searchProperty('nothing');
    expect(results).toEqual([]);
    vi.unstubAllGlobals();
  });
});

// --- findLowerComps (fetch mocked) ---

describe('findLowerComps', () => {
  const subject = {
    lat: 39.95,
    lng: -75.16,
    category_code: '1',
    total_livable_area: '1200',
    number_of_bedrooms: '3',
    number_of_bathrooms: '2',
    year_built: '1950',
    parcel_number: '123456789',
    market_value: '300000',
  };

  it('returns rows on success', async () => {
    const mockRows = [{ parcel_number: '999' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: mockRows }),
    }));
    const results = await findLowerComps(subject);
    expect(results).toEqual(mockRows);
    vi.unstubAllGlobals();
  });

  it('throws when no coordinates', async () => {
    await expect(findLowerComps({ parcel_number: '1' })).rejects.toThrow('no geographic coordinates');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(findLowerComps(subject)).rejects.toThrow('API request failed');
    vi.unstubAllGlobals();
  });
});

// --- findRecentSales (fetch mocked) ---

describe('findRecentSales', () => {
  const subject = {
    lat: 39.95,
    lng: -75.16,
    category_code: '1',
    total_livable_area: '1200',
    number_of_bedrooms: '3',
    parcel_number: '123456789',
  };

  it('returns rows on success', async () => {
    const mockRows = [{ parcel_number: '888', sale_price: '250000' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: mockRows }),
    }));
    const results = await findRecentSales(subject);
    expect(results).toEqual(mockRows);
    vi.unstubAllGlobals();
  });

  it('throws when no coordinates', async () => {
    await expect(findRecentSales({ parcel_number: '1' })).rejects.toThrow('no geographic coordinates');
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(findRecentSales(subject)).rejects.toThrow('API request failed');
    vi.unstubAllGlobals();
  });
});
