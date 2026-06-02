import { describe, it, expect } from 'vitest';
import { buildChildSearchOr, isDateLike, escapeOrValue } from './patient-search';

describe('buildChildSearchOr', () => {
  // The regression: a non-date query used to inject `date_of_birth.eq.null`,
  // which made PostgREST coerce "null" to a date and 500 the whole search.
  it('does NOT add a date_of_birth term for a name query', () => {
    const filter = buildChildSearchOr('vaibhav');
    expect(filter).toBe('first_name.ilike.*vaibhav*,last_name.ilike.*vaibhav*,name.ilike.*vaibhav*');
    expect(filter).not.toContain('date_of_birth');
    expect(filter).not.toContain('null');
  });

  it('includes the `name` column term for pre-migration ChildBloom rows', () => {
    const filter = buildChildSearchOr('Arjun');
    expect(filter).toContain('name.ilike.*Arjun*');
    expect(filter).toContain('first_name.ilike.*Arjun*');
  });

  it('adds a date_of_birth term only for a real ISO date', () => {
    const filter = buildChildSearchOr('2024-03-15');
    expect(filter).toBe(
      'first_name.ilike.*2024-03-15*,last_name.ilike.*2024-03-15*,name.ilike.*2024-03-15*,date_of_birth.eq.2024-03-15',
    );
  });

  it('never emits a bare `date_of_birth.eq.null` (or non-date) term', () => {
    for (const q of ['vaibhav', 'a', 'Smith', 'O Brien', '2024', '15-03-2024', 'null']) {
      const filter = buildChildSearchOr(q);
      expect(filter).not.toMatch(/date_of_birth\.eq\.(null|undefined)/);
    }
  });

  it('strips PostgREST or() delimiters from the query so the filter cannot malform', () => {
    const filter = buildChildSearchOr('O\'Brien, (x)');
    expect(filter).not.toContain('(');
    expect(filter).not.toContain(')');
    // Three terms: first_name, last_name, name → two separating commas.
    expect(filter.split(',').length).toBe(3);
  });
});

describe('isDateLike', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isDateLike('2024-03-15')).toBe(true);
  });
  it('rejects names and partial/other date formats', () => {
    for (const q of ['vaibhav', '2024', '15-03-2024', '2024/03/15', 'null']) {
      expect(isDateLike(q)).toBe(false);
    }
  });
});

describe('escapeOrValue', () => {
  it('removes commas and parentheses', () => {
    expect(escapeOrValue('a,(b)c')).toBe('a  b c');
    expect(escapeOrValue('Smith')).toBe('Smith');
  });
});
