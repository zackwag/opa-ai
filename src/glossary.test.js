import { describe, expect, it } from 'vitest';
import { getTooltip } from './glossary';

describe('getTooltip', () => {
  it('returns description for a known label', () => {
    const tip = getTooltip('Market Value (Assessment)');
    expect(tip).toBeTruthy();
    expect(typeof tip).toBe('string');
  });

  it('returns description for alternate label mapping', () => {
    expect(getTooltip('Market Value')).toBeTruthy();
    expect(getTooltip('Assessment')).toBeTruthy();
  });

  it('returns null for unknown label', () => {
    expect(getTooltip('Nonexistent Field')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getTooltip('')).toBeNull();
  });

  it('returns description for Bedrooms', () => {
    const tip = getTooltip('Bedrooms');
    expect(tip).toBeTruthy();
  });

  it('returns description for Exterior Condition', () => {
    const tip = getTooltip('Exterior Condition');
    expect(tip).toBeTruthy();
    expect(tip).toContain('exterior');
  });

  it('returns description for Garage', () => {
    const tip = getTooltip('Garage');
    expect(tip).toBeTruthy();
    expect(tip).toContain('parking');
  });
});
