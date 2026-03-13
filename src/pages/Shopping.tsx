import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

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

export default function Shopping() {
  const [mealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const shoppingList = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; unit: string; category: string }> = {};
    mealPlan.forEach(item => {
      const recipe = mockRecipes.find(r => r.id === item.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const key = `${ing.name}_${ing.unit}`;
        if (map[key]) {
          map[key].quantity += ing.quantity;
        } else {
          map[key] = { ...ing };
        }
      });
    });
    return Object.entries(map).map(([key, val]) => ({ key, ...val }));
  }, [mealPlan]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof shoppingList> = {};
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
                <ul className="space-y-2">
                  {grouped[cat].map(item => (
                    <li key={item.key} className="flex items-center gap-3">
                      <Checkbox
                        checked={checked.has(item.key)}
                        onCheckedChange={() => toggle(item.key)}
                      />
                      <span className={`text-sm flex-1 ${checked.has(item.key) ? 'line-through text-muted-foreground' : ''}`}>
                        {item.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(item.quantity * 10) / 10} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
