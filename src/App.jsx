import { useState } from 'react'
import { searchProperty, findLowerComps, findRecentSales, scoreSimilarity, computeAppealStats, computeSalesStats } from './api'
import PropertyMap from './PropertyMap'
import AddressAutocomplete from './AddressAutocomplete'
import FieldLabel from './Tooltip'
import { generateAppealPdf } from './generatePdf'
import './App.css'

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 'N/A';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function AppealSummary({ stats }) {
  if (!stats) return null;
  return (
    <div className="appeal-summary">
      <h2>Appeal Summary</h2>
      <p className="appeal-headline">
        Your property is assessed <strong>{formatCurrency(stats.overAssessment)}</strong> ({stats.overPct}%) higher
        than the average of {stats.count} comparable nearby homes.
      </p>
      <div className="appeal-stats">
        <div className="appeal-stat">
          <span className="label">Your Assessment</span>
          <span className="value high">{formatCurrency(stats.subjectValue)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Avg Comp Assessment</span>
          <span className="value low">{formatCurrency(stats.avg)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Median Comp Assessment</span>
          <span className="value low">{formatCurrency(stats.median)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Potential Reduction</span>
          <span className="value low">{formatCurrency(stats.overAssessment)}</span>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ property }) {
  return (
    <div className="subject-card">
      <h2>Your Property: {property.location || 'Unknown Address'}</h2>
      <div className="property-grid">
        <div className="property-stat">
          <FieldLabel text="Market Value (Assessment)" />
          <span className="value">{formatCurrency(property.market_value)}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Bedrooms" />
          <span className="value">{property.number_of_bedrooms || 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Bathrooms" />
          <span className="value">{property.number_of_bathrooms || 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Livable Area" />
          <span className="value">{property.total_livable_area ? `${parseInt(property.total_livable_area).toLocaleString()} sqft` : 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Year Built" />
          <span className="value">{property.year_built || 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Stories" />
          <span className="value">{property.number_stories || 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Lot Area" />
          <span className="value">{property.total_area ? `${parseInt(property.total_area).toLocaleString()} sqft` : 'N/A'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Central Air" />
          <span className="value">{property.central_air === 'Y' ? 'Yes' : 'No'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="Basement" />
          <span className="value">{property.basements || 'None'}</span>
        </div>
        <div className="property-stat">
          <FieldLabel text="ZIP Code" />
          <span className="value">{property.zip_code || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

function CompCard({ comp, subjectValue, selected, onToggle, selectionFull }) {
  const savings = parseInt(subjectValue) - parseInt(comp.market_value);
  const distanceText = comp.distance_m != null
    ? comp.distance_m < 100 ? `${Math.round(comp.distance_m)}m` : `${(comp.distance_m / 1000).toFixed(2)}km`
    : 'N/A';

  return (
    <div className={`comp-card ${selected ? 'comp-selected' : ''}`}>
      <div className="comp-card-header">
        <div>
          <p className="address">{comp.location || 'Unknown'}</p>
          <p className="zip">{distanceText} away</p>
        </div>
        <button
          className={`select-btn ${selected ? 'selected' : ''}`}
          onClick={onToggle}
          disabled={!selected && selectionFull}
          title={selected ? 'Remove from appeal' : selectionFull ? 'Max 5 selected' : 'Add to appeal'}
        >
          {selected ? '✓' : '+'}
        </button>
      </div>
      <div className="details">
        <div className="detail">
          <FieldLabel text="Assessment" />
          <span className="value">{formatCurrency(comp.market_value)}</span>
        </div>
        <div className="detail">
          <span className="label">Below Yours By</span>
          <span className="value savings">{formatCurrency(savings)}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Bedrooms" />
          <span className="value">{comp.number_of_bedrooms || 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Bathrooms" />
          <span className="value">{comp.number_of_bathrooms || 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Livable Area" />
          <span className="value">{comp.total_livable_area ? `${parseInt(comp.total_livable_area).toLocaleString()} sqft` : 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Year Built" />
          <span className="value">{comp.year_built || 'N/A'}</span>
        </div>
      </div>
      <div className="similarity">
        <div className="similarity-bar">
          <div className="fill" style={{ width: `${comp.similarity}%` }} />
        </div>
        <span className="similarity-score">{comp.similarity}% similar</span>
      </div>
    </div>
  );
}

function SalesSummary({ stats }) {
  if (!stats) return null;
  return (
    <div className="sales-summary">
      <h2>Recent Sales Evidence</h2>
      <p className="appeal-headline">
        Of {stats.count} similar nearby homes that sold recently, <strong>{stats.belowAssessment} ({stats.pctBelow}%) sold below your assessed value</strong>.
      </p>
      <div className="appeal-stats">
        <div className="appeal-stat">
          <span className="label">Your Assessment</span>
          <span className="value high">{formatCurrency(stats.subjectValue)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Avg Sale Price</span>
          <span className="value">{formatCurrency(stats.avg)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Median Sale Price</span>
          <span className="value">{formatCurrency(stats.median)}</span>
        </div>
        <div className="appeal-stat">
          <span className="label">Sold Below Assessment</span>
          <span className="value low">{stats.belowAssessment} of {stats.count}</span>
        </div>
      </div>
    </div>
  );
}

function SaleCard({ sale, subjectValue }) {
  const diff = parseInt(sale.sale_price) - parseInt(subjectValue);
  const below = diff < 0;
  const distanceText = sale.distance_m != null
    ? sale.distance_m < 100 ? `${Math.round(sale.distance_m)}m` : `${(sale.distance_m / 1000).toFixed(2)}km`
    : 'N/A';

  return (
    <div className={`comp-card ${below ? 'sale-below' : ''}`}>
      <p className="address">{sale.location || 'Unknown'}</p>
      <p className="zip">{distanceText} away | Sold {new Date(sale.sale_date).toLocaleDateString()}</p>
      <div className="details">
        <div className="detail">
          <FieldLabel text="Sale Price" />
          <span className="value">{formatCurrency(sale.sale_price)}</span>
        </div>
        <div className="detail">
          <span className="label">{below ? 'Below Your Assessment' : 'Above Your Assessment'}</span>
          <span className={`value ${below ? 'savings' : 'over'}`}>{formatCurrency(Math.abs(diff))}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Bedrooms" />
          <span className="value">{sale.number_of_bedrooms || 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Bathrooms" />
          <span className="value">{sale.number_of_bathrooms || 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Livable Area" />
          <span className="value">{sale.total_livable_area ? `${parseInt(sale.total_livable_area).toLocaleString()} sqft` : 'N/A'}</span>
        </div>
        <div className="detail">
          <FieldLabel text="Year Built" />
          <span className="value">{sale.year_built || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(800);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [subject, setSubject] = useState(null);
  const [comps, setComps] = useState(null);
  const [appealStats, setAppealStats] = useState(null);
  const [recentSales, setRecentSales] = useState(null);
  const [salesStats, setSalesStats] = useState(null);
  const [selectedComps, setSelectedComps] = useState([]);

  function toggleComp(comp) {
    setSelectedComps(prev => {
      const exists = prev.find(c => c.parcel_number === comp.parcel_number);
      if (exists) return prev.filter(c => c.parcel_number !== comp.parcel_number);
      if (prev.length >= 5) return prev;
      return [...prev, comp];
    });
  }

  function isSelected(comp) {
    return selectedComps.some(c => c.parcel_number === comp.parcel_number);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!address.trim()) return;
    await doSearch(address);
  }

  async function doSearch(query) {
    setError('');
    setLoading(true);
    setSubject(null);
    setComps(null);
    setSearchResults(null);
    setAppealStats(null);
    setRecentSales(null);
    setSalesStats(null);
    setSelectedComps([]);

    try {
      const results = await searchProperty(query);
      if (results.length === 0) {
        setError('No properties found. Try a Philadelphia address like "1500 MARKET ST".');
      } else if (results.length === 1) {
        await selectProperty(results[0]);
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function selectProperty(property) {
    setSearchResults(null);
    setSubject(property);
    setLoading(true);
    setError('');

    try {
      const [raw, sales] = await Promise.all([
        findLowerComps(property, radius),
        findRecentSales(property, radius),
      ]);

      const scored = raw
        .map(comp => ({ ...comp, similarity: scoreSimilarity(property, comp) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);
      setComps(scored);
      setAppealStats(computeAppealStats(property, scored));

      setRecentSales(sales);
      setSalesStats(computeSalesStats(property, sales));
    } catch (err) {
      setError(`Failed to find comparables: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRadiusChange(newRadius) {
    setRadius(newRadius);
    if (subject) {
      setLoading(true);
      setError('');
      try {
        const [raw, sales] = await Promise.all([
          findLowerComps(subject, newRadius),
          findRecentSales(subject, newRadius),
        ]);

        const scored = raw
          .map(comp => ({ ...comp, similarity: scoreSimilarity(subject, comp) }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 20);
        setComps(scored);
        setAppealStats(computeAppealStats(subject, scored));

        setRecentSales(sales);
        setSalesStats(computeSalesStats(subject, sales));
      } catch (err) {
        setError(`Failed to find comparables: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>Property Assessment Appeal Tool</h1>
        <p>Find comparable nearby homes assessed lower than yours to support a tax assessment appeal</p>
      </header>

      <section className="search-section">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="field">
            <label htmlFor="address">Your Property Address</label>
            <AddressAutocomplete
              onSelect={(addr) => { setAddress(addr); doSearch(addr); }}
              disabled={loading}
            />
          </div>
          <div className="field radius-field">
            <label htmlFor="radius">Search Radius</label>
            <select id="radius" value={radius} onChange={e => handleRadiusChange(Number(e.target.value))}>
              <option value={400}>400m (~2 blocks)</option>
              <option value={800}>800m (~5 blocks)</option>
              <option value={1200}>1.2km (~8 blocks)</option>
              <option value={1600}>1.6km (~1 mile)</option>
            </select>
          </div>
          <button type="submit" disabled={loading || !address.trim()}>
            {loading ? 'Searching...' : 'Find Lower Comps'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </section>

      {searchResults && (
        <section className="search-section">
          <h2 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--text-h)' }}>
            Multiple matches - select your property:
          </h2>
          {searchResults.map(r => (
            <div
              key={r.parcel_number}
              className="search-result-row"
              onClick={() => selectProperty(r)}
            >
              <strong>{r.location}</strong>
              <span style={{ marginLeft: '12px', color: 'var(--text)', fontSize: '14px' }}>
                {r.category_code_description} | Assessed: {formatCurrency(r.market_value)}
              </span>
            </div>
          ))}
        </section>
      )}

      {loading && !searchResults && (
        <div className="loading">
          <div className="spinner" />
          <p>Finding lower-assessed comparable homes nearby...</p>
        </div>
      )}

      {subject && <PropertyCard property={subject} />}

      {subject && comps && (
        <PropertyMap subject={subject} comps={comps} radius={radius} />
      )}

      {appealStats && <AppealSummary stats={appealStats} />}

      {selectedComps.length > 0 && (
        <div className="pdf-bar">
          <span>{selectedComps.length}/5 comps selected for appeal</span>
          <button
            className="pdf-btn"
            onClick={() => generateAppealPdf(subject, selectedComps, recentSales)}
          >
            Generate Appeal PDF
          </button>
        </div>
      )}

      {comps && comps.length > 0 && (
        <section className="comps-section">
          <h2>Lower-Assessed Comparable Homes</h2>
          <p className="subtitle">
            {comps.length} similar homes within {radius >= 1000 ? `${(radius/1000).toFixed(1)}km` : `${radius}m`} assessed below yours — select up to 5 for your appeal
          </p>
          <div className="comps-grid">
            {comps.map(comp => (
              <CompCard
                key={comp.parcel_number}
                comp={comp}
                subjectValue={subject.market_value}
                selected={isSelected(comp)}
                onToggle={() => toggleComp(comp)}
                selectionFull={selectedComps.length >= 5}
              />
            ))}
          </div>
        </section>
      )}

      {comps && comps.length === 0 && (
        <div className="error">No lower-assessed comparable properties found within this radius. Try increasing the search radius.</div>
      )}

      {salesStats && <SalesSummary stats={salesStats} />}

      {recentSales && recentSales.length > 0 && (
        <section className="comps-section">
          <h2>Recent Nearby Sales</h2>
          <p className="subtitle">
            {recentSales.length} similar homes sold within {radius >= 1000 ? `${(radius/1000).toFixed(1)}km` : `${radius}m`} in the last 2 years
          </p>
          <div className="comps-grid">
            {recentSales.map(sale => (
              <SaleCard key={sale.parcel_number + sale.sale_date} sale={sale} subjectValue={subject.market_value} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default App
