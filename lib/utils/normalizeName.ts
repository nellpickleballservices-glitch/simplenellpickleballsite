export function normalizeName(raw: string): string {
  // Split on whitespace to handle multi-word names, then capitalize first char of each word.
  // Using split/map avoids \b word-boundary issues with accented characters (e.g. 'maría' → 'María').
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
}

export function validateName(name: string): string | null {
  if (name.trim().length === 0) return 'Name is required'
  if (/\d/.test(name)) return 'Name cannot contain numbers'
  return null
}
