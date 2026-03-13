import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Copy, ChefHat, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const MEAL_TYPE_LABELS = { breakfast: 'Petit déj.', lunch: 'Déjeuner', dinner: 'Dîner' };

export default function Planning() {
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const now = new Date();
    return addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const getMealsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mealPlan.filter(m => m.date === dateStr);
  };

  const getRecipe = (id: string) => mockRecipes.find(r => r.id === id);

  const removeMeal = (id: string) => {
    setMealPlan(prev => prev.filter(m => m.id !== id));
  };

  const duplicateMeal = (item: MealPlanItem) => {
    const nextDay = format(addDays(new Date(item.date), 1), 'yyyy-MM-dd');
    setMealPlan(prev => [...prev, { ...item, id: `mp_${Date.now()}`, date: nextDay }]);
  };

  const toggleBatchCooking = (id: string) => {
    setMealPlan(prev => prev.map(m => m.id === id ? { ...m, isBatchCooking: !m.isBatchCooking } : m));
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Planning</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="tap-scale" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
              Cette semaine
            </Button>
            <Button variant="outline" size="icon" className="tap-scale" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {days.map((day, i) => {
            const meals = getMealsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`card-elevated p-4 ${isToday ? 'ring-2 ring-primary/30' : ''}`}
              >
                <h3 className={`font-display font-semibold text-sm mb-2 capitalize ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'EEEE d MMMM', { locale: fr })}
                  {isToday && <span className="ml-2 text-xs font-normal text-primary">(aujourd'hui)</span>}
                </h3>

                {meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun repas planifié</p>
                ) : (
                  <div className="space-y-2">
                    {meals.map(meal => {
                      const recipe = getRecipe(meal.recipeId);
                      if (!recipe) return null;
                      return (
                        <div key={meal.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {meal.isBatchCooking && <ChefHat className="w-4 h-4 text-secondary shrink-0" />}
                            <span className="text-xs text-muted-foreground w-16 shrink-0">
                              {MEAL_TYPE_LABELS[meal.mealType]}
                            </span>
                            <span className="text-sm font-medium truncate">{recipe.title}</span>
                            <span className="text-xs text-muted-foreground">{recipe.calories} kcal</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleBatchCooking(meal.id)}>
                              <ChefHat className={`w-3.5 h-3.5 ${meal.isBatchCooking ? 'text-secondary' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMeal(meal)}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMeal(meal.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
