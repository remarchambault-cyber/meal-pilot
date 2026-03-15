import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog, MealPlanItem } from '@/data/types';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import { calculateCalorieTarget, getGoalLabel } from '@/lib/calories';
import { PLANNING_MEAL_TYPE_LABELS_SHORT, PLANNING_MEAL_TYPE_ORDER } from '@/lib/mealTypes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { CalendarDays, ShoppingCart, TrendingUp, Target, Scale, Flame, CheckCircle2, Utensils, ArrowRight, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { allRecipes } = useRecipes();
  const { mealPlan, toggleConsumed } = useMealPlan();
  const [weightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [calorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);

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

  if (!profile || !target) {
    navigate('/onboarding');
    return null;
  }

  const cards = [
    { icon: Target, label: 'Objectif', value: getGoalLabel(profile.goal), color: 'text-primary', bg: 'bg-primary/8' },
    { icon: Flame, label: 'Cible du jour', value: `${target.target} kcal`, color: 'text-foreground', bg: 'bg-accent/60' },
    { icon: Scale, label: 'Poids actuel', value: `${currentWeight} kg`, color: 'text-foreground', bg: 'bg-muted' },
  ];

  const actions = [
    { icon: CalendarDays, label: 'Planifier mes repas', to: '/planning' },
    { icon: ShoppingCart, label: 'Liste de courses', to: '/shopping' },
    { icon: TrendingUp, label: 'Suivi & pesée', to: '/tracking' },
  ];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Bonjour {profile.firstName}
          </h1>
          <p className="text-body-text text-sm mt-2 leading-relaxed">
            Maintien estimé {target.tdee} kcal · Objectif {target.target} kcal/jour
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-elevated p-4 flex flex-col items-center text-center gap-2"
            >
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <div>
                <p className="font-display font-bold text-lg leading-tight">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Calories overview */}
        {(plannedCalories > 0 || todayCalories) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plannedCalories > 0 && (
              <div className="card-elevated p-5">
                <p className="section-title mb-2">Calories prévues</p>
                <p className="font-display font-bold text-2xl">{plannedCalories} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
              </div>
            )}
            {todayCalories && (
              <div className="card-elevated p-5">
                <p className="section-title mb-2">Consommées</p>
                <div className="flex items-baseline gap-3">
                  <p className="font-display font-bold text-2xl">{todayCalories.caloriesConsumed} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
                  {todayCalories.caloriesBurned > 0 && (
                    <span className="text-sm text-primary font-medium">-{todayCalories.caloriesBurned} dépensées</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Today's meals */}
        {todayMeals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card-elevated p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-sm">Repas du jour</h2>
              <span className="text-xs text-muted-foreground">{todayMeals.filter(m => m.consumed).length}/{todayMeals.length} consommés</span>
            </div>
            <div className="space-y-1">
              {todayMeals.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => toggleConsumed(meal.id)}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 w-full text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {meal.consumed ? (
                      <CheckCircle2 className="w-[18px] h-[18px] text-primary shrink-0" />
                    ) : (
                      <Circle className="w-[18px] h-[18px] text-border shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${meal.consumed ? 'text-foreground' : 'text-body-text'}`}>{meal.name}</p>
                      <p className="text-[11px] text-muted-foreground">{PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType]}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3 font-medium">{meal.calories} kcal</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card-elevated p-8 text-center"
          >
            <Utensils className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-body-text font-medium">Aucun repas planifié aujourd'hui</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoute des repas depuis le planning pour commencer.</p>
            <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => navigate('/planning')}>
              Aller au planning <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="space-y-3">
          <p className="section-title">Actions rapides</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {actions.map(action => (
              <Button
                key={action.to}
                variant="outline"
                className="h-auto py-4 justify-between gap-3 tap-scale bg-card hover:bg-muted/50 border-border/60"
                onClick={() => navigate(action.to)}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4.5 h-4.5 text-primary" />
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
