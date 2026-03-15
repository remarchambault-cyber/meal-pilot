import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import { Recipe } from '@/data/types';
import { calculateCalorieTarget, getMealCalorieSuggestion } from '@/lib/calories';
import { PLANNING_MEAL_TYPE_LABELS_SHORT } from '@/lib/mealTypes';
import { getScaleFactorForMealType, scaleRecipe } from '@/lib/recipeScaling';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Flame, RefreshCw, Plus, Eye, Target, Search, X } from 'lucide-react';
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
  const { profile } = useProfile();
  const { allRecipes, loading: recipesLoading } = useRecipes();
  const { addMeals } = useMealPlan();
  const [filter, setFilter] = useState<MealFilter>('all');
  const [seed, setSeed] = useState(0);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');

  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);
  const mealTargets = useMemo(() => target ? getMealCalorieSuggestion(target.target) : null, [target]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const typeFiltered = filter === 'all'
      ? [...allRecipes]
      : allRecipes.filter(recipe => recipe.mealType === filter);

    const searchFiltered = q
      ? typeFiltered.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
      : typeFiltered;

    return searchFiltered
      .map(recipe => {
        const sf = getScaleFactorForMealType(recipe, mealTargets);
        const scaledCal = Math.round(recipe.calories * sf);
        const mealTarget = mealTargets?.[recipe.mealType] || 0;
        const calorieGap = mealTarget ? Math.abs(scaledCal - mealTarget) : 0;
        const jitter = getSeededJitter(seed, recipe.id);
        return { recipe, scaleFactor: sf, scaledCalories: scaledCal, score: calorieGap + jitter };
      })
      .sort((a, b) => a.score - b.score);
  }, [allRecipes, filter, mealTargets, seed, search]);

  const selectedFilterTarget = useMemo(() => {
    if (!mealTargets || filter === 'all') return null;
    return mealTargets[filter];
  }, [mealTargets, filter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Idées repas</h1>
          <Button variant="ghost" size="sm" className="gap-2 tap-scale text-muted-foreground hover:text-foreground" onClick={() => setSeed(s => s + 1)}>
            <RefreshCw className="w-3.5 h-3.5" />
            Mélanger
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une recette…"
            className="pl-10 pr-9 h-11 rounded-xl bg-card"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(value) => setFilter(value as MealFilter)}>
            <SelectTrigger className="w-48 rounded-xl">
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
            <span className="text-[11px] bg-muted px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-muted-foreground">
              <Target className="w-3 h-3 text-primary" />
              Cible : ~{selectedFilterTarget} kcal
            </span>
          )}
        </div>

        {recipesLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Chargement…</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ recipe, scaleFactor, scaledCalories }, i) => {
              const scaled = scaleRecipe(recipe, scaleFactor);

              return (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="card-elevated p-5 space-y-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-base">{recipe.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {PLANNING_MEAL_TYPE_LABELS_SHORT[recipe.mealType]}
                      </span>
                    </div>
                    <p className="text-sm text-body-text leading-relaxed">{recipe.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {scaledCalories} kcal
                    </span>
                    {scaled.isScaled && (
                      <span className="text-[11px] text-primary font-medium">ajusté</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{recipe.prepTime} min</span>
                  </div>

                  {scaled.isScaled && (
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>P {scaled.protein}g</span>
                      <span>G {scaled.carbs}g</span>
                      <span>L {scaled.fat}g</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="gap-1.5 tap-scale rounded-lg text-xs" onClick={() => navigate(`/recipe/${recipe.id}?scale=${scaleFactor}`)}>
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </Button>
                    <Button size="sm" className="gap-1.5 tap-scale rounded-lg text-xs" onClick={() => setModalRecipe(recipe)}>
                      <Plus className="w-3.5 h-3.5" /> Au planning
                    </Button>
                  </div>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-body-text">{search ? 'Aucune recette trouvée.' : 'Aucune recette pour ce type de repas.'}</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setFilter('all'); setSearch(''); setSeed(s => s + 1); }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {modalRecipe && (
        <AddToPlanModal
          open={!!modalRecipe}
          onOpenChange={(open) => !open && setModalRecipe(null)}
          recipe={modalRecipe}
          mealTargets={mealTargets}
          onAdd={(items) => addMeals(items)}
        />
      )}
    </AppLayout>
  );
}
