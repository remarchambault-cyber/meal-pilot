import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog, MealPlanItem, Recipe } from '@/data/types';
import { calculateCalorieTarget, getGoalLabel } from '@/lib/calories';
import { mockRecipes } from '@/data/recipes';
import { PLANNING_MEAL_TYPE_LABELS_SHORT, PLANNING_MEAL_TYPE_ORDER } from '@/lib/mealTypes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { CalendarDays, ShoppingCart, TrendingUp, Target, Scale, Flame, CheckCircle2, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [weightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [calorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);
  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);

  const currentWeight = weightLogs.length > 0
    ? [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0].weight
    : profile?.weightKg || 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCalories = calorieLogs.find(l => l.date === today);

  const plannedCalories = useMemo(() => {
    return mealPlan
      .filter(m => m.date === today)
      .reduce((sum, meal) => {
        const recipe = allRecipes.find(r => r.id === meal.recipeId);
        const sf = meal.scaleFactor || 1;
        return sum + (recipe ? Math.round(recipe.calories * sf) * (meal.portions || 1) : 0);
      }, 0);
  }, [mealPlan, today, allRecipes]);

  const todayMeals = useMemo(() => {
    const meals = mealPlan.filter(m => m.date === today);
    return PLANNING_MEAL_TYPE_ORDER
      .flatMap(type => meals.filter(m => m.mealType === type))
      .map(m => {
        const recipe = allRecipes.find(r => r.id === m.recipeId);
        const sf = m.scaleFactor || 1;
        return recipe ? {
          id: m.id,
          name: recipe.title,
          mealType: m.mealType,
          calories: Math.round(recipe.calories * sf) * (m.portions || 1),
          consumed: !!m.consumed,
        } : null;
      })
      .filter(Boolean) as { id: string; name: string; mealType: MealPlanItem['mealType']; calories: number; consumed: boolean }[];
  }, [mealPlan, today, allRecipes]);

  const toggleConsumed = (mealId: string) => {
    setMealPlan(prev => prev.map(m => m.id === mealId ? { ...m, consumed: !m.consumed } : m));
  };

  if (!profile || !target) {
    navigate('/onboarding');
    return null;
  }

  const cards = [
    { icon: Target, label: 'Objectif', value: getGoalLabel(profile.goal), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Flame, label: 'Cible du jour', value: `${target.target} kcal`, color: 'text-accent', bg: 'bg-accent/10' },
    { icon: Scale, label: 'Poids actuel', value: `${currentWeight} kg`, color: 'text-secondary', bg: 'bg-secondary/10' },
  ];

  const actions = [
    { icon: CalendarDays, label: 'Planifier mes repas', to: '/planning' },
    { icon: ShoppingCart, label: 'Liste de courses', to: '/shopping' },
    { icon: TrendingUp, label: 'Enregistrer mon poids', to: '/tracking' },
  ];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Bonjour {profile.firstName} 👋</h1>
          <p className="text-body-text text-sm mt-1">
            Maintien estimé : {target.tdee} kcal · Objectif : {target.target} kcal/jour
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-display font-bold text-lg">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {plannedCalories > 0 && (
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground mb-1">Calories prévues aujourd'hui</p>
            <p className="font-display font-bold text-xl">{plannedCalories} kcal</p>
          </div>
        )}

        {todayCalories && (
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground mb-1">Calories consommées aujourd'hui</p>
            <div className="flex items-center gap-4">
              <span className="font-display font-bold text-xl">{todayCalories.caloriesConsumed} kcal</span>
              {todayCalories.caloriesBurned > 0 && (
                <>
                  <span className="font-display font-bold text-xl text-secondary">{todayCalories.caloriesBurned} kcal</span>
                  <span className="text-sm text-muted-foreground">dépensées</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Repas du jour */}
        {todayMeals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-elevated p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" /> Repas du jour
              </h2>
              <span className="text-[10px] text-muted-foreground">{todayMeals.filter(m => m.consumed).length}/{todayMeals.length} consommés</span>
            </div>
            <div className="space-y-0.5">
              {todayMeals.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => toggleConsumed(meal.id)}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0 w-full text-left hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {meal.consumed ? (
                      <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${meal.consumed ? '' : 'text-muted-foreground'}`}>{meal.name}</p>
                      <p className="text-[10px] text-muted-foreground">{PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType]}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{meal.calories} kcal</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-elevated p-4 text-center"
          >
            <p className="text-sm text-muted-foreground">Aucun repas planifié aujourd'hui</p>
            <Button variant="link" size="sm" className="mt-1" onClick={() => navigate('/planning')}>
              Planifier mes repas →
            </Button>
          </motion.div>
        )}
        <div className="space-y-2">
          <h2 className="text-lg font-display font-semibold">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {actions.map(action => (
              <Button
                key={action.to}
                variant="outline"
                className="h-auto py-4 justify-start gap-3 tap-scale"
                onClick={() => navigate(action.to)}
              >
                <action.icon className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
