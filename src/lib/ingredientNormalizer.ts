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

/** Normalize an ingredient name: lowercase, trim, merge plural/singular variants */
export function normalizeIngredientName(name: string): string {
  const lower = name.trim().toLowerCase();
  return PLURAL_MAP[lower] || lower;
}

/** Create a stable key for deduplication */
export function ingredientKey(name: string, unit: string): string {
  return `${normalizeIngredientName(name)}__${unit.trim().toLowerCase()}`;
}
