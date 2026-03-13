import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import { calculateCalorieTarget } from '@/lib/calories';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Flame, RefreshCw, Plus, Eye } from 'lucide-react';
import { MealPlanItem } from '@/data/types';
import { motion } from 'framer-motion';

export default function Meals() {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [filter, setFilter] = useState<string>('all');
  const [seed, setSeed] = useState(0);

  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);

  const filtered = useMemo(() => {
    let recipes = [...mockRecipes];
    if (filter !== 'all') {
      recipes = recipes.filter(r => r.mealType === filter);
    }
    if (profile?.dietPreference && profile.dietPreference !== 'none') {
      recipes = recipes.filter(r => r.dietTags.includes(profile.dietPreference));
    }
    // Simple shuffle based on seed
    return recipes.sort(() => Math.sin(seed + recipes.length) - 0.5);
  }, [filter, profile, seed]);

  const addToPlan = (recipeId: string, mealType: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const item: MealPlanItem = {
      id: `mp_${Date.now()}`,
      date: today,
      mealType: mealType as MealPlanItem['mealType'],
      recipeId,
      isBatchCooking: false,
    };
    setMealPlan(prev => [...prev, item]);
  };

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

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type de repas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="breakfast">Petit déjeuner</SelectItem>
            <SelectItem value="lunch">Déjeuner</SelectItem>
            <SelectItem value="dinner">Dîner</SelectItem>
          </SelectContent>
        </Select>

        <div className="space-y-3">
          {filtered.map((recipe, i) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card-elevated p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-semibold text-base">{recipe.title}</h3>
                  <p className="text-sm text-body-text mt-0.5">{recipe.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-accent" />{recipe.calories} kcal</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{recipe.prepTime} min</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 tap-scale"
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                >
                  <Eye className="w-4 h-4" /> Recette
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 tap-scale"
                  onClick={() => addToPlan(recipe.id, recipe.mealType)}
                >
                  <Plus className="w-4 h-4" /> Au planning
                </Button>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune recette ne correspond à tes critères.</p>
              <Button variant="outline" className="mt-3" onClick={() => { setFilter('all'); setSeed(s => s + 1); }}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
