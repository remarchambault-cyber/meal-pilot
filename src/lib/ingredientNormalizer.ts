// Normalize ingredient names to merge duplicates (singular/plural, case, accents)

const PLURAL_MAP: Record<string, string> = {
  'œufs': 'œuf',
  'oeufs': 'œuf',
  'oeuf': 'œuf',
  'tomates': 'tomate',
  'bananes': 'banane',
  'pommes': 'pomme',
  'carottes': 'carotte',
  'courgettes': 'courgette',
  'poivrons': 'poivron',
  'oignons': 'oignon',
  'avocats': 'avocat',
  'citrons': 'citron',
  'concombres': 'concombre',
  'pommes de terre': 'pomme de terre',
  'patates douces': 'patate douce',
  'haricots verts': 'haricot vert',
  'champignons': 'champignon',
  'épinards': 'épinard',
  'lentilles': 'lentille',
  'pois chiches': 'pois chiche',
  'amandes': 'amande',
  'noix': 'noix',
  'noisettes': 'noisette',
  'olives': 'olive',
  'crevettes': 'crevette',
  'sardines': 'sardine',
  'tranches': 'tranche',
  'pièces': 'pièce',
};

const UNIT_PLURAL_MAP: Record<string, string> = {
  'pièces': 'pièce',
  'tranches': 'tranche',
  'feuilles': 'feuille',
  'gousses': 'gousse',
  'pincées': 'pincée',
  'cuillères': 'cuillère',
  'tasses': 'tasse',
};

/** Normalize a unit: lowercase, trim, merge plural/singular */
export function normalizeUnit(unit: string): string {
  const lower = unit.trim().toLowerCase();
  return UNIT_PLURAL_MAP[lower] || lower;
}

/** Normalize an ingredient name: lowercase, trim, merge plural/singular variants */
export function normalizeIngredientName(name: string): string {
  const lower = name.trim().toLowerCase();
  // Try exact match first
  if (PLURAL_MAP[lower]) return PLURAL_MAP[lower];
  // Generic French plural: try removing trailing 's' or 'x'
  if (lower.endsWith('s') && lower.length > 3) {
    const singular = lower.slice(0, -1);
    if (PLURAL_MAP[singular]) return PLURAL_MAP[singular];
    return singular;
  }
  if (lower.endsWith('x') && lower.length > 3) {
    const singular = lower.slice(0, -1);
    if (PLURAL_MAP[singular]) return PLURAL_MAP[singular];
    return singular;
  }
  return lower;
}

/** Create a stable key for deduplication */
export function ingredientKey(name: string, unit: string): string {
  return `${normalizeIngredientName(name)}__${normalizeUnit(unit)}`;
}
