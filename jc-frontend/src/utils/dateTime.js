const TIMEZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The backend stores timestamps in UTC, but legacy LocalDateTime responses do
 * not include an offset. Add the UTC designator so browsers do not interpret
 * those values as local wall-clock time.
 */
export function parseApiDate(value) {
  if (typeof value !== "string") return new Date(value);

  const normalized = TIMEZONE_SUFFIX_PATTERN.test(value) ? value : `${value}Z`;
  return new Date(normalized);
}
