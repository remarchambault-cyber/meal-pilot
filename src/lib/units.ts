// Natural unit formatting for shopping list
const COUNTABLE_UNITS = new Set(['pièce', 'pièces', 'tranche', 'tranches', 'pincée', 'c.à.s', 'c.à.c']);

export function formatQuantity(quantity: number, unit: string): string {
  // For countable units, round up to whole numbers
  if (COUNTABLE_UNITS.has(unit)) {
    return `${Math.ceil(quantity)}`;
  }
  // For weight/volume, round to nearest sensible value
  if (quantity >= 100) {
    return `${Math.round(quantity)}`;
  }
  if (quantity >= 10) {
    return `${Math.round(quantity / 5) * 5}`;
  }
  // Small quantities: 1 decimal
  return `${Math.round(quantity * 10) / 10}`;
}

export function formatUnit(quantity: number, unit: string): string {
  // Pluralize "pièce" -> "pièces", "tranche" -> "tranches"
  const rounded = COUNTABLE_UNITS.has(unit) ? Math.ceil(quantity) : quantity;
  if (rounded > 1) {
    if (unit === 'pièce') return 'pièces';
    if (unit === 'tranche') return 'tranches';
  }
  if (rounded <= 1) {
    if (unit === 'pièces') return 'pièce';
    if (unit === 'tranches') return 'tranche';
  }
  return unit;
}
