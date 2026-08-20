const CARTO_URL = 'https://phl.carto.com/api/v2/sql';

const FIELDS = [
  'parcel_number', 'location', 'zip_code', 'category_code',
  'category_code_description', 'building_code_description',
  'market_value', 'sale_price', 'sale_date',
  'number_of_bedrooms', 'number_of_bathrooms', 'number_of_rooms',
  'number_stories', 'total_area', 'total_livable_area',
  'year_built', 'exterior_condition', 'interior_condition',
  'quality_grade', 'central_air', 'fireplaces',
  'garage_type', 'garage_spaces', 'basements',
  'frontage', 'depth', 'general_construction',
  'fuel', 'type_heater', 'zoning',
  'taxable_building', 'taxable_land', 'owner_1',
  'ST_Y(the_geom) as lat', 'ST_X(the_geom) as lng'
].join(', ');

const COMP_FIELDS = [
  'parcel_number', 'location', 'zip_code', 'category_code',
  'market_value', 'number_of_bedrooms', 'number_of_bathrooms',
  'number_stories', 'total_area', 'total_livable_area',
  'year_built', 'exterior_condition', 'central_air', 'basements',
  'building_code_description',
  'ST_Y(the_geom) as lat', 'ST_X(the_geom) as lng',
].join(', ');

function buildQuery(sql) {
  return `${CARTO_URL}?q=${encodeURIComponent(sql)}`;
}

const STREET_ABBREVIATIONS = {
  'street': 'ST', 'st': 'ST',
  'avenue': 'AVE', 'ave': 'AVE',
  'boulevard': 'BLVD', 'blvd': 'BLVD',
  'drive': 'DR', 'dr': 'DR',
  'road': 'RD', 'rd': 'RD',
  'lane': 'LN', 'ln': 'LN',
  'court': 'CT', 'ct': 'CT',
  'place': 'PL', 'pl': 'PL',
  'circle': 'CIR', 'cir': 'CIR',
  'terrace': 'TER', 'ter': 'TER',
  'way': 'WAY',
  'parkway': 'PKWY', 'pkwy': 'PKWY',
  'square': 'SQ', 'sq': 'SQ',
  'pike': 'PIKE',
  'trail': 'TRL', 'trl': 'TRL',
};

const DIRECTION_ABBREVIATIONS = {
  'north': 'N', 'n': 'N',
  'south': 'S', 's': 'S',
  'east': 'E', 'e': 'E',
  'west': 'W', 'w': 'W',
  'northeast': 'NE', 'ne': 'NE',
  'northwest': 'NW', 'nw': 'NW',
  'southeast': 'SE', 'se': 'SE',
  'southwest': 'SW', 'sw': 'SW',
};

const ORDINAL_MAP = {
  'first': '1ST', 'second': '2ND', 'third': '3RD', 'fourth': '4TH',
  'fifth': '5TH', 'sixth': '6TH', 'seventh': '7TH', 'eighth': '8TH',
  'ninth': '9TH', 'tenth': '10TH', 'eleventh': '11TH', 'twelfth': '12TH',
};

function normalizeOrdinal(word) {
  const lower = word.toLowerCase();
  if (ORDINAL_MAP[lower]) return ORDINAL_MAP[lower];
  const match = word.match(/^(\d+)(st|nd|rd|th)?$/i);
  if (match) {
    const num = match[1];
    const suffixes = { '1': 'ST', '2': 'ND', '3': 'RD' };
    const lastDigit = num.slice(-1);
    const lastTwo = num.slice(-2);
    let suffix = 'TH';
    if (!['11', '12', '13'].includes(lastTwo)) {
      suffix = suffixes[lastDigit] || 'TH';
    }
    return num + suffix;
  }
  return null;
}

export function normalizeAddress(input) {
  let addr = input.trim().toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const parts = addr.split(' ');
  const normalized = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lower = part.toLowerCase();

    if (DIRECTION_ABBREVIATIONS[lower]) {
      normalized.push(DIRECTION_ABBREVIATIONS[lower]);
    } else if (STREET_ABBREVIATIONS[lower]) {
      normalized.push(STREET_ABBREVIATIONS[lower]);
    } else {
      const ordinal = normalizeOrdinal(part);
      if (ordinal && i > 0) {
        normalized.push(ordinal);
      } else {
        normalized.push(part);
      }
    }
  }

  return normalized.join(' ');
}

export async function searchProperty(address) {
  const normalized = normalizeAddress(address).replace(/'/g, "''");
  const sql = `SELECT ${FIELDS} FROM opa_properties_public WHERE UPPER(location) LIKE '%${normalized}%' LIMIT 10`;
  const res = await fetch(buildQuery(sql));
  if (!res.ok) throw new Error('Failed to search properties');
  const data = await res.json();
  if (data.error) throw new Error(data.error[0] || 'Query error');
  return data.rows || [];
}

export async function findLowerComps(subject, radiusMeters = 800) {
  const conditions = [];

  if (!subject.lat || !subject.lng) {
    throw new Error('Property has no geographic coordinates');
  }

  // Geographic proximity — within radius
  const point = `ST_SetSRID(ST_MakePoint(${subject.lng}, ${subject.lat}), 4326)::geography`;
  conditions.push(`ST_DWithin(the_geom::geography, ${point}, ${radiusMeters})`);

  if (subject.category_code) {
    conditions.push(`category_code = '${subject.category_code}'`);
  }

  if (subject.total_livable_area) {
    const area = parseInt(subject.total_livable_area);
    const low = Math.round(area * 0.7);
    const high = Math.round(area * 1.3);
    conditions.push(`total_livable_area BETWEEN ${low} AND ${high}`);
  }

  if (subject.number_of_bedrooms) {
    const beds = parseInt(subject.number_of_bedrooms);
    conditions.push(`number_of_bedrooms BETWEEN ${beds - 1} AND ${beds + 1}`);
  }

  if (subject.number_of_bathrooms) {
    const baths = parseInt(subject.number_of_bathrooms);
    conditions.push(`number_of_bathrooms BETWEEN ${baths - 1} AND ${baths + 1}`);
  }

  if (subject.year_built) {
    const year = parseInt(subject.year_built);
    if (!isNaN(year)) {
      conditions.push(`year_built != '' AND year_built IS NOT NULL AND year_built::int BETWEEN ${year - 25} AND ${year + 25}`);
    }
  }

  conditions.push(`parcel_number != '${subject.parcel_number}'`);
  conditions.push(`market_value > 0`);

  if (subject.market_value) {
    conditions.push(`market_value <= ${parseInt(subject.market_value)}`);
  }

  const distanceExpr = `ST_Distance(the_geom::geography, ${point}) as distance_m`;
  const where = conditions.join(' AND ');
  const sql = `SELECT ${COMP_FIELDS}, ${distanceExpr} FROM opa_properties_public WHERE ${where} ORDER BY distance_m LIMIT 100`;

  const res = await fetch(buildQuery(sql));
  if (!res.ok) throw new Error('API request failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error[0] || 'Query error');
  return data.rows || [];
}

export function scoreSimilarity(subject, comp) {
  let score = 0;
  let maxScore = 0;

  function compare(field, weight, tolerance) {
    const sv = parseFloat(subject[field]);
    const cv = parseFloat(comp[field]);
    if (isNaN(sv) || isNaN(cv)) return;
    maxScore += weight;
    if (tolerance === 0) {
      if (sv === cv) score += weight;
    } else {
      const diff = Math.abs(sv - cv) / (tolerance || 1);
      score += weight * Math.max(0, 1 - diff);
    }
  }

  // Proximity bonus — closer = better for appeal
  if (comp.distance_m != null) {
    maxScore += 15;
    score += 15 * Math.max(0, 1 - comp.distance_m / 800);
  }

  compare('number_of_bedrooms', 20, 2);
  compare('number_of_bathrooms', 15, 2);
  compare('total_livable_area', 25, subject.total_livable_area * 0.4 || 500);
  compare('year_built', 15, 25);
  compare('number_stories', 10, 1);
  compare('total_area', 10, subject.total_area * 0.4 || 1000);

  if (subject.central_air && comp.central_air) {
    maxScore += 5;
    if (subject.central_air === comp.central_air) score += 5;
  }

  if (subject.basements && comp.basements) {
    maxScore += 5;
    if (subject.basements === comp.basements) score += 5;
  }

  if (subject.exterior_condition && comp.exterior_condition) {
    maxScore += 10;
    const diff = Math.abs(parseInt(subject.exterior_condition) - parseInt(comp.exterior_condition));
    if (!isNaN(diff)) {
      score += 10 * Math.max(0, 1 - diff / 4);
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

export async function findRecentSales(subject, radiusMeters = 800, yearsBack = 2) {
  if (!subject.lat || !subject.lng) {
    throw new Error('Property has no geographic coordinates');
  }

  const point = `ST_SetSRID(ST_MakePoint(${subject.lng}, ${subject.lat}), 4326)::geography`;
  const conditions = [];

  conditions.push(`ST_DWithin(the_geom::geography, ${point}, ${radiusMeters})`);

  if (subject.category_code) {
    conditions.push(`category_code = '${subject.category_code}'`);
  }

  // Filter to actual arm's-length sales (exclude $1 transfers, sheriff sales under $1000, etc.)
  conditions.push(`sale_price > 1000`);

  // Recent sales only
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack);
  conditions.push(`sale_date >= '${cutoff.toISOString().split('T')[0]}'`);

  // Similar size
  if (subject.total_livable_area) {
    const area = parseInt(subject.total_livable_area);
    const low = Math.round(area * 0.6);
    const high = Math.round(area * 1.4);
    conditions.push(`total_livable_area BETWEEN ${low} AND ${high}`);
  }

  // Similar beds
  if (subject.number_of_bedrooms) {
    const beds = parseInt(subject.number_of_bedrooms);
    conditions.push(`number_of_bedrooms BETWEEN ${beds - 1} AND ${beds + 1}`);
  }

  conditions.push(`parcel_number != '${subject.parcel_number}'`);

  const distanceExpr = `ST_Distance(the_geom::geography, ${point}) as distance_m`;
  const where = conditions.join(' AND ');
  const fields = `location, sale_price, sale_date, market_value, number_of_bedrooms, number_of_bathrooms, total_livable_area, year_built, parcel_number, ST_Y(the_geom) as lat, ST_X(the_geom) as lng`;
  const sql = `SELECT ${fields}, ${distanceExpr} FROM opa_properties_public WHERE ${where} ORDER BY sale_date DESC LIMIT 50`;

  const res = await fetch(buildQuery(sql));
  if (!res.ok) throw new Error('API request failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error[0] || 'Query error');
  return data.rows || [];
}

export function computeSalesStats(subject, sales) {
  if (!sales.length) return null;

  const subjectValue = parseInt(subject.market_value) || 0;
  const prices = sales.map(s => parseInt(s.sale_price)).filter(v => !isNaN(v) && v > 0);

  if (!prices.length) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median = sorted[Math.floor(sorted.length / 2)];
  const belowAssessment = sales.filter(s => parseInt(s.sale_price) < subjectValue).length;
  const pctBelow = Math.round((belowAssessment / sales.length) * 100);

  return { avg, median, count: prices.length, subjectValue, belowAssessment, pctBelow };
}

export function computeAppealStats(subject, comps) {
  if (!comps.length) return null;

  const subjectValue = parseInt(subject.market_value) || 0;
  const values = comps.map(c => parseInt(c.market_value)).filter(v => !isNaN(v) && v > 0);

  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const median = sorted[Math.floor(sorted.length / 2)];
  const overAssessment = subjectValue - avg;
  const overPct = Math.round((overAssessment / avg) * 100);

  return { avg, median, overAssessment, overPct, count: values.length, subjectValue };
}
