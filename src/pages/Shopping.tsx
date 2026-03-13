import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem, Recipe } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { formatQuantity, formatUnit } from '@/lib/units';
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

interface ShoppingItem {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  sources: { recipeName: string; quantity: number; unit: string; portions: number }[];
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
      recipe.ingredients.forEach(ing => {
        const key = `${ing.name}_${ing.unit}`;
        const qty = ing.quantity * portions;
        if (map[key]) {
          map[key].quantity += qty;
          map[key].sources.push({ recipeName: recipe.title, quantity: ing.quantity, unit: ing.unit, portions });
        } else {
          map[key] = {
            key,
            name: ing.name,
            quantity: qty,
            unit: ing.unit,
            category: ing.category,
            sources: [{ recipeName: recipe.title, quantity: ing.quantity, unit: ing.unit, portions }],
          };
        }
      });
    });
    return Object.values(map);
  }, [mealPlan, allRecipes]);

  const grouped = useMemo(() => {
    const g: Record<string, ShoppingItem[]> = {};
    shoppingList.forEach(item => {
      const cat = item.category;
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [shoppingList]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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
                    return (
                      <li key={item.key}>
                        <div className="flex items-center gap-3 py-1.5">
                          <Checkbox
                            checked={checked.has(item.key)}
                            onCheckedChange={() => toggle(item.key)}
                          />
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
                          <div className="ml-9 mb-2 space-y-0.5">
                            {item.sources.map((src, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                • {formatQuantity(src.quantity * src.portions, src.unit)} {formatUnit(src.quantity * src.portions, src.unit)} pour {src.recipeName}
                                {src.portions > 1 && ` (×${src.portions})`}
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
