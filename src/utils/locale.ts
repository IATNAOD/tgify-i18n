/** `'en_US'` → `{ full: 'en-us', base: 'en' }`, the form locales are stored under */
export function normalizeLocale(code: string): { full: string; base: string } {
  const full = code.trim().toLowerCase().replace(/_/g, '-')
  const base = full.split('-')[0] as string
  return { full, base }
}
