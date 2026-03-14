import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem, Recipe } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { formatQuantity, formatUnit } from '@/lib/units';
import { normalizeIngredientName, ingredientKey } from '@/lib/ingredientNormalizer';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORY_ORDER = ['protein', 'carbs', 'vegetables', 'dairy', 'fruits', 'condiments', 'other'];
const CATEGORY_LABELS: Record<string, string> = {
  protein: '🥩 Protéines',
  carbs: '🍚 Féculents',
  vegetables: '🥬 Légumes',
  dairy: '🧀 Produits laitiers',
  fruits: '🍎 Fruits',
  condiments: '🧂 Assaisonnements',
  other: '📦 Autres',
};

interface ShoppingSource {
  recipeName: string;
  quantity: number;
  unit: string;
  portions: number;
}

interface ShoppingItem {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  sources: ShoppingSource[];
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Shopping() {
  const [mealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);

  const shoppingList = useMemo(() => {
    const map: Record<string, ShoppingItem> = {};

    mealPlan.forEach(item => {
      const recipe = allRecipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      const portions = item.portions || 1;
      const sf = item.scaleFactor || 1;

      recipe.ingredients.forEach(ingredient => {
        const key = ingredientKey(ingredient.name, ingredient.unit);
        const totalQty = Math.round(ingredient.quantity * sf * portions * 10) / 10;

        if (!map[key]) {
          map[key] = {
            key,
            name: capitalize(normalizeIngredientName(ingredient.name)),
            quantity: 0,
            unit: ingredient.unit,
            category: ingredient.category,
            sources: [],
          };
        }

        map[key].quantity += totalQty;
        map[key].sources.push({
          recipeName: recipe.title,
          quantity: Math.round(ingredient.quantity * sf * 10) / 10,
          unit: ingredient.unit,
          portions,
        });
      });
    });

    return Object.values(map);
  }, [mealPlan, allRecipes]);

  const grouped = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    shoppingList.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [shoppingList]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-display font-bold">Liste de courses</h1>

        {shoppingList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Aucun repas planifié</p>
            <p className="text-sm mt-1">Ajoute des repas à ton planning pour générer ta liste.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {CATEGORY_ORDER.filter(cat => grouped[cat]).map(cat => (
              <motion.div
                key={cat}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-elevated p-4"
              >
                <h2 className="font-display font-semibold text-sm mb-3">{CATEGORY_LABELS[cat]}</h2>
                <ul className="space-y-1">
                  {grouped[cat].map(item => {
                    const isExpanded = expanded.has(item.key);
                    const aggregatedSources = item.sources.reduce<Record<string, { recipeName: string; quantity: number; unit: string; occurrences: number }>>((acc, source) => {
                      if (!acc[source.recipeName]) {
                        acc[source.recipeName] = { recipeName: source.recipeName, quantity: 0, unit: source.unit, occurrences: 0 };
                      }
                      acc[source.recipeName].quantity += source.quantity * source.portions;
                      acc[source.recipeName].occurrences += 1;
                      return acc;
                    }, {});
                    const detailedSources = Object.values(aggregatedSources).sort((a, b) => b.quantity - a.quantity);

                    return (
                      <li key={item.key}>
                        <div className="flex items-center gap-3 py-1.5">
                          <Checkbox checked={checked.has(item.key)} onCheckedChange={() => toggle(item.key)} />
                          <span className={`text-sm flex-1 ${checked.has(item.key) ? 'line-through text-muted-foreground' : ''}`}>
                            {item.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatQuantity(item.quantity, item.unit)} {formatUnit(item.quantity, item.unit)}
                          </span>
                          {item.sources.length > 0 && (
                            <button onClick={() => toggleExpand(item.key)} className="text-muted-foreground hover:text-foreground p-1">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="ml-9 mb-2 space-y-1.5">
                            <p className="text-xs text-muted-foreground">
                              Total : {formatQuantity(item.quantity, item.unit)} {formatUnit(item.quantity, item.unit)} · {item.sources.length} occurrence{item.sources.length > 1 ? 's' : ''}
                            </p>
                            {detailedSources.map(source => (
                              <p key={source.recipeName} className="text-xs text-muted-foreground">
                                • {formatQuantity(source.quantity, source.unit)} {formatUnit(source.quantity, source.unit)} pour {source.recipeName}
                                {source.occurrences > 1 ? ` (${source.occurrences} fois)` : ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
