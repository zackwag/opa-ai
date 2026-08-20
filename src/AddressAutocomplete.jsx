import { useState, useRef, useEffect } from 'react';
import { normalizeAddress } from './api';

const CARTO_URL = 'https://phl.carto.com/api/v2/sql';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function fetchSuggestions(query) {
  const normalized = normalizeAddress(query).replace(/'/g, "''");
  const sql = `SELECT location, parcel_number, market_value, category_code_description FROM opa_properties_public WHERE UPPER(location) LIKE '${normalized}%' LIMIT 8`;
  const res = await fetch(`${CARTO_URL}?q=${encodeURIComponent(sql)}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.error) return [];
  return data.rows || [];
}

export default function AddressAutocomplete({ onSelect, disabled }) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  const debouncedFetch = useRef(
    debounce(async (query) => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const results = await fetchSuggestions(query);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    }, 300)
  ).current;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    setValue(v);
    debouncedFetch(v);
  }

  function handleSelect(suggestion) {
    setValue(suggestion.location);
    setSuggestions([]);
    setOpen(false);
    onSelect(suggestion.location);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function formatCurrency(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <input
        id="address"
        type="text"
        placeholder="e.g. 1838 S 4th St"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
        autoComplete="off"
      />
      {open && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={s.parcel_number}
              className={i === activeIndex ? 'active' : ''}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={() => handleSelect(s)}
            >
              <span className="suggestion-address">{s.location}</span>
              <span className="suggestion-meta">
                {s.category_code_description} {s.market_value ? `| ${formatCurrency(s.market_value)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
