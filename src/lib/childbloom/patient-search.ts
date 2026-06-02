// Pure query-building helpers for the patient search route.
// Extracted so the PostgREST `or()` filter logic can be unit-tested without a
// live Supabase connection — this is the regression guard for the bug where a
// non-date query injected `date_of_birth.eq.null` and 500'd the whole search.

export function isDateLike(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Strip characters that are structural in PostgREST's `or()` grammar
// (commas separate terms; parentheses group them). Leaving them in would let
// a name like "O'Brien, (x)" malform the filter or 500 the query.
export function escapeOrValue(s: string): string {
  return s.replace(/[(),]/g, ' ').trim();
}

// Build the PostgREST `or()` filter for a children search.
//
// CRITICAL: only emit a `date_of_birth` term when the query is genuinely a date.
// `date_of_birth` is a Postgres `date` column. A term like `date_of_birth.eq.null`
// (or `.eq.<non-date>`) forces PostgREST to coerce the literal string to a date,
// which raises `invalid input syntax for type date` and fails the ENTIRE query —
// silently killing the valid name matches alongside it.
export function buildChildSearchOr(query: string): string {
  const safe = escapeOrValue(query);
  // PostgREST's or() filter uses * as the wildcard for ilike (not %) because
  // % is a URL-reserved character that URLSearchParams encodes to %25, breaking
  // the pattern match. * passes through unencoded and PostgREST maps it to %.
  // `name` covers any pre-split rows; first_name/last_name cover split rows.
  const terms = [
    `first_name.ilike.*${safe}*`,
    `last_name.ilike.*${safe}*`,
    `name.ilike.*${safe}*`,
  ];
  if (isDateLike(query)) {
    terms.push(`date_of_birth.eq.${query}`);
  }
  return terms.join(',');
}
