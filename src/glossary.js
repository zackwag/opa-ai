import fieldsData from './fields.json';

const glossary = {};

fieldsData.records.forEach(record => {
  const key = record.field_17_raw;
  const label = record.field_188_raw;
  const description = record.field_20_raw || '';
  if (key && description) {
    glossary[key] = { label, description };
  }
});

// Map our display labels to their field keys
const LABEL_TO_FIELD = {
  'Market Value (Assessment)': 'market_value',
  'Market Value': 'market_value',
  'Assessment': 'market_value',
  'Bedrooms': 'number_of_bedrooms',
  'Bathrooms': 'number_of_bathrooms',
  'Livable Area': 'total_livable_area',
  'Year Built': 'year_built',
  'Stories': 'number_stories',
  'Lot Area': 'total_area',
  'Central Air': 'central_air',
  'Basement': 'basements',
  'Garage': 'garage_type',
  'ZIP Code': 'zip_code',
  'Sale Price': 'sale_price',
  'Sale Date': 'sale_date',
  'Exterior Condition': 'exterior_condition',
  'Interior Condition': 'interior_condition',
  'Quality Grade': 'quality_grade',
  'Fuel': 'fuel',
  'Heater': 'type_heater',
  'Zoning': 'zoning',
  'Frontage': 'frontage',
  'Depth': 'depth',
};

export function getTooltip(displayLabel) {
  const fieldKey = LABEL_TO_FIELD[displayLabel];
  if (!fieldKey) return null;
  const entry = glossary[fieldKey];
  if (!entry || !entry.description) return null;
  return entry.description;
}

export default glossary;
