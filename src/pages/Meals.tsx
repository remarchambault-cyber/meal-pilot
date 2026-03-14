import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, Recipe, MealPlanItem } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import { calculateCalorieTarget, getMealCalorieSuggestion } from '@/lib/calories';
import { PLANNING_MEAL_TYPE_LABELS_SHORT } from '@/lib/mealTypes';
import { getScaleFactorForMealType, scaleRecipe } from '@/lib/recipeScaling';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Flame, RefreshCw, Plus, Eye, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import AddToPlanModal from '@/components/AddToPlanModal';

type MealFilter = 'all' | Recipe['mealType'] | 'snack';

const FILTER_LABELS: Record<MealFilter, string> = {
  all: 'Tous les repas',
  breakfast: 'Petit déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

function getSeededJitter(seed: number, recipeId: string) {
  let hash = 0;
  for (let i = 0; i < recipeId.length; i += 1) {
    hash = (hash << 5) - hash + recipeId.charCodeAt(i);
    hash |= 0;
  }
  const raw = Math.sin(hash + seed * 97) * 10000;
  return (raw - Math.floor(raw)) * 45;
}

export default function Meals() {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);
  const [filter, setFilter] = useState<MealFilter>('all');
  const [seed, setSeed] = useState(0);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);
  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);
  const mealTargets = useMemo(() => target ? getMealCalorieSuggestion(target.target) : null, [target]);

  const filtered = useMemo(() => {
    const typeFiltered = filter === 'all'
      ? [...allRecipes]
      : allRecipes.filter(recipe => recipe.mealType === filter);

    return typeFiltered
      .map(recipe => {
        const sf = getScaleFactorForMealType(recipe, mealTargets);
        const scaledCal = Math.round(recipe.calories * sf);
        const mealTarget = mealTargets?.[recipe.mealType] || 0;
        const calorieGap = mealTarget ? Math.abs(scaledCal - mealTarget) : 0;
        const jitter = getSeededJitter(seed, recipe.id);
        return { recipe, scaleFactor: sf, scaledCalories: scaledCal, score: calorieGap + jitter };
      })
      .sort((a, b) => a.score - b.score);
  }, [allRecipes, filter, mealTargets, seed]);

  const selectedFilterTarget = useMemo(() => {
    if (!mealTargets || filter === 'all') return null;
    return mealTargets[filter];
  }, [mealTargets, filter]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Idées repas</h1>
          <Button variant="outline" size="sm" className="gap-2 tap-scale" onClick={() => setSeed(s => s + 1)}>
            <RefreshCw className="w-4 h-4" />
            Régénérer
          </Button>
        </div>

        {target && (
          <p className="text-sm text-muted-foreground">Objectif : {target.target} kcal/jour</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(value) => setFilter(value as MealFilter)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Type de repas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="breakfast">Petit déjeuner</SelectItem>
              <SelectItem value="lunch">Déjeuner</SelectItem>
              <SelectItem value="dinner">Dîner</SelectItem>
              <SelectItem value="snack">Collation</SelectItem>
            </SelectContent>
          </Select>

          {selectedFilterTarget && (
            <span className="text-xs bg-muted px-2.5 py-1 rounded-md flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-primary" />
              Cible {FILTER_LABELS[filter]} : ~{selectedFilterTarget} kcal
            </span>
          )}
        </div>

        <div className="space-y-3">
          {filtered.map(({ recipe, scaleFactor, scaledCalories }, i) => {
            const mealTarget = mealTargets?.[recipe.mealType] || 0;
            const calorieDelta = mealTarget ? scaledCalories - mealTarget : null;
            const scaled = scaleRecipe(recipe, scaleFactor);

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="card-elevated p-4 space-y-3 transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-base">{recipe.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {PLANNING_MEAL_TYPE_LABELS_SHORT[recipe.mealType]}
                      </span>
                    </div>
                    <p className="text-sm text-body-text mt-0.5">{recipe.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-accent" />
                    {scaledCalories} kcal
                  </span>
                  {scaled.isScaled && (
                    <span className="text-xs text-primary">
                      Portion ajustée
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{recipe.prepTime} min</span>
                </div>

                {scaled.isScaled && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>P {scaled.protein}g</span>
                    <span>G {scaled.carbs}g</span>
                    <span>L {scaled.fat}g</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 tap-scale" onClick={() => navigate(`/recipe/${recipe.id}?scale=${scaleFactor}`)}>
                    <Eye className="w-4 h-4" /> Recette
                  </Button>
                  <Button size="sm" className="gap-1.5 tap-scale" onClick={() => setModalRecipe(recipe)}>
                    <Plus className="w-4 h-4" /> Au planning
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune recette pour ce type de repas.</p>
              <Button variant="outline" className="mt-3" onClick={() => { setFilter('all'); setSeed(s => s + 1); }}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </div>

      {modalRecipe && (
        <AddToPlanModal
          open={!!modalRecipe}
          onOpenChange={(open) => !open && setModalRecipe(null)}
          recipe={modalRecipe}
          mealTargets={mealTargets}
          onAdd={(items) => setMealPlan(prev => [...prev, ...items])}
        />
      )}
    </AppLayout>
  );
}
