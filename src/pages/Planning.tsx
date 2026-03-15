import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { MealPlanItem, Recipe } from '@/data/types';
import { calculateCalorieTarget, getMealCalorieSuggestion } from '@/lib/calories';
import { getScaleFactor } from '@/lib/recipeScaling';
import { gapTextColor } from '@/lib/gapColor';
import {
  filterRecipesByMealType,
  PLANNING_MEAL_TYPE_LABELS,
  PLANNING_MEAL_TYPE_LABELS_SHORT,
  PLANNING_MEAL_TYPE_ORDER,
} from '@/lib/mealTypes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Copy, ChefHat, Trash2, Plus, Target, MoreVertical, Eye, CheckCircle2, Circle, Search, X, Calendar, Flame, UtensilsCrossed } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const MEAL_TYPE_ACCENT: Record<string, string> = {
  breakfast: 'meal-accent-breakfast',
  lunch: 'meal-accent-lunch',
  dinner: 'meal-accent-dinner',
  snack: 'meal-accent-snack',
};

const MEAL_TYPE_ICON_BG: Record<string, string> = {
  breakfast: 'bg-[hsl(30,80%,55%,0.1)] text-[hsl(30,80%,45%)]',
  lunch: 'bg-primary/10 text-primary',
  dinner: 'bg-[hsl(250,40%,55%,0.1)] text-[hsl(250,40%,45%)]',
  snack: 'bg-[hsl(340,45%,55%,0.1)] text-[hsl(340,45%,45%)]',
};

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function Planning() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { allRecipes } = useRecipes();
  const { mealPlan, addMeals, removeMeal: removeMealFromDb, toggleConsumed, duplicateMeals } = useMealPlan();
  const isMobile = useIsMobile();

  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialogDate, setAddDialogDate] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<Recipe['mealType']>('lunch');
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);
  const [batchDays, setBatchDays] = useState<string[]>([]);
  const [batchMealTypes, setBatchMealTypes] = useState<MealPlanItem['mealType'][]>([]);

  const [duplicateSourceMeal, setDuplicateSourceMeal] = useState<MealPlanItem | null>(null);
  const [duplicateDays, setDuplicateDays] = useState<string[]>([]);
  const [recipeSearch, setRecipeSearch] = useState('');

  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);
  const mealSuggestions = useMemo(() => target ? getMealCalorieSuggestion(target.target) : null, [target]);

  const weekStart = useMemo(() => {
    const now = new Date();
    return addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const filteredRecipes = useMemo(() => {
    const byType = filterRecipesByMealType(allRecipes, selectedMealType);
    if (!recipeSearch.trim()) return byType;
    const q = recipeSearch.trim().toLowerCase();
    return byType.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [allRecipes, selectedMealType, recipeSearch]);

  const batchSelectableDays = useMemo(() => {
    if (!addDialogDate) return [];
    const base = new Date(`${addDialogDate}T12:00:00`);
    return Array.from({ length: 14 }, (_, i) => toDateKey(addDays(base, i)));
  }, [addDialogDate]);

  const duplicateSelectableDays = useMemo(() => {
    if (!duplicateSourceMeal) return [];
    const base = new Date(`${duplicateSourceMeal.date}T12:00:00`);
    return Array.from({ length: 14 }, (_, i) => toDateKey(addDays(base, i + 1)));
  }, [duplicateSourceMeal]);

  const getMealsForDay = (date: Date) => {
    const dateStr = toDateKey(date);
    return mealPlan
      .filter(m => m.date === dateStr)
      .sort((a, b) => PLANNING_MEAL_TYPE_ORDER.indexOf(a.mealType) - PLANNING_MEAL_TYPE_ORDER.indexOf(b.mealType));
  };

  const getRecipe = (id: string) => allRecipes.find(r => r.id === id);

  const getDayCalories = (date: Date) => {
    const meals = getMealsForDay(date);
    return meals.reduce((sum, m) => {
      const recipe = getRecipe(m.recipeId);
      const sf = m.scaleFactor || 1;
      return sum + (recipe ? Math.round(recipe.calories * sf) * (m.portions || 1) : 0);
    }, 0);
  };

  const removeMeal = async (id: string) => {
    try {
      await removeMealFromDb(id);
      toast({ title: 'Repas retiré du planning' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleToggleConsumed = async (id: string) => {
    try {
      await toggleConsumed(id);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const openAddDialog = (dateStr: string) => {
    setAddDialogDate(dateStr);
    setSelectedMealType('lunch');
    setSelectedRecipeId('');
    setRecipeSearch('');
    setPortions(1);
    setIsBatchCooking(false);
    setBatchDays([dateStr]);
    setBatchMealTypes(['lunch']);
  };

  const toggleBatchMealType = (type: MealPlanItem['mealType']) => {
    setBatchMealTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleBatchDay = (day: string) => {
    setBatchDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const toggleDuplicateDay = (day: string) => {
    setDuplicateDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const batchSelectedMealTypes = useMemo(
    () => PLANNING_MEAL_TYPE_ORDER.filter(t => batchMealTypes.includes(t)),
    [batchMealTypes]
  );

  const batchTotalOccurrences = isBatchCooking ? batchDays.length * batchSelectedMealTypes.length : 1;
  const batchTotalPortions = batchTotalOccurrences * portions;

  const handleQuickAdd = async () => {
    if (!addDialogDate || !selectedRecipeId) return;

    const recipe = getRecipe(selectedRecipeId);
    if (!recipe) return;

    if (isBatchCooking) {
      const selectedDates = [...batchDays].sort((a, b) => a.localeCompare(b));
      if (selectedDates.length === 0) {
        toast({ title: 'Aucun jour sélectionné', variant: 'destructive' });
        return;
      }
      if (batchSelectedMealTypes.length === 0) {
        toast({ title: 'Aucun repas sélectionné', variant: 'destructive' });
        return;
      }

      const items: MealPlanItem[] = [];
      let idx = 0;
      for (const date of selectedDates) {
        for (const mt of batchSelectedMealTypes) {
          const mealTarget = mealSuggestions?.[mt] || 0;
          const sf = mealTarget ? getScaleFactor(recipe.calories, mealTarget) : 1;
          items.push({
            id: `mp_${Date.now()}_${date.replace(/-/g, '')}_${mt}_${idx++}`,
            date,
            mealType: mt,
            recipeId: selectedRecipeId,
            isBatchCooking: true,
            portions,
            scaleFactor: sf,
          });
        }
      }

      try {
        await addMeals(items);
        setAddDialogDate(null);
        const mealLabels = batchSelectedMealTypes.map(t => PLANNING_MEAL_TYPE_LABELS_SHORT[t]).join(', ');
        toast({
          title: 'Batch cooking planifié',
          description: `${recipe.title} · ${selectedDates.length} jour${selectedDates.length > 1 ? 's' : ''} × ${batchSelectedMealTypes.length} repas (${mealLabels}) · ${batchTotalPortions} portion${batchTotalPortions > 1 ? 's' : ''}`,
        });
      } catch {
        toast({ title: 'Erreur', variant: 'destructive' });
      }
    } else {
      const mealTarget = mealSuggestions?.[selectedMealType] || 0;
      const sf = mealTarget ? getScaleFactor(recipe.calories, mealTarget) : 1;

      const items: MealPlanItem[] = [{
        id: `mp_${Date.now()}_${addDialogDate.replace(/-/g, '')}_0`,
        date: addDialogDate,
        mealType: selectedMealType,
        recipeId: selectedRecipeId,
        isBatchCooking: false,
        portions,
        scaleFactor: sf,
      }];

      try {
        await addMeals(items);
        setAddDialogDate(null);
        toast({
          title: 'Repas ajouté',
          description: `${recipe.title} — ${Math.round(recipe.calories * sf)} kcal`,
        });
      } catch {
        toast({ title: 'Erreur', variant: 'destructive' });
      }
    }
  };

  const openDuplicateDialog = (meal: MealPlanItem) => {
    const defaultDuplicateDate = toDateKey(addDays(new Date(`${meal.date}T12:00:00`), 1));
    setDuplicateSourceMeal(meal);
    setDuplicateDays([defaultDuplicateDate]);
  };

  const confirmDuplicate = async () => {
    if (!duplicateSourceMeal || duplicateDays.length === 0) return;
    try {
      await duplicateMeals(duplicateSourceMeal, duplicateDays);
      setDuplicateSourceMeal(null);
      setDuplicateDays([]);
      toast({ title: 'Repas dupliqué', description: `Ajouté sur ${duplicateDays.length} jour${duplicateDays.length > 1 ? 's' : ''}` });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const addDialogDateFormatted = addDialogDate
    ? format(new Date(`${addDialogDate}T12:00:00`), 'EEEE d MMMM', { locale: fr })
    : '';

  const duplicateRecipe = duplicateSourceMeal ? getRecipe(duplicateSourceMeal.recipeId) : null;

  const weekLabel = useMemo(() => {
    const start = days[0];
    const end = days[6];
    return `${format(start, 'd MMM', { locale: fr })} — ${format(end, 'd MMM yyyy', { locale: fr })}`;
  }, [days]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Planning</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {weekLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="tap-scale h-9 w-9 rounded-xl" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-9 px-4 rounded-xl font-medium" onClick={() => setWeekOffset(0)}>
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="icon" className="tap-scale h-9 w-9 rounded-xl" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calorie targets bar */}
        {mealSuggestions && target && (
          <div className="card-elevated p-3 sm:p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none">Objectif journalier</p>
                <p className="text-sm font-semibold font-display">{target.target} kcal</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-border" />
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'breakfast', label: 'Pdj', val: mealSuggestions.breakfast },
                { key: 'lunch', label: 'Déj', val: mealSuggestions.lunch },
                { key: 'snack', label: 'Coll', val: mealSuggestions.snack },
                { key: 'dinner', label: 'Dîner', val: mealSuggestions.dinner },
              ].map(({ key, label, val }) => (
                <span key={key} className={cn(
                  'text-[11px] px-2.5 py-1 rounded-lg font-medium',
                  MEAL_TYPE_ICON_BG[key]
                )}>
                  {label} {val}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Days */}
        <div className="space-y-4">
          {days.map((day, i) => {
            const meals = getMealsForDay(day);
            const isToday = isSameDay(day, new Date());
            const plannedCalories = getDayCalories(day);
            const dailyTarget = target?.target || 0;
            const gap = plannedCalories - dailyTarget;
            const progress = dailyTarget > 0 ? Math.min((plannedCalories / dailyTarget) * 100, 100) : 0;

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className={cn(
                  'card-elevated overflow-hidden',
                  isToday && 'ring-2 ring-primary/20'
                )}
              >
                {/* Day header */}
                <div className={cn(
                  'px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between border-b border-border/40',
                  isToday && 'bg-primary/[0.03]'
                )}>
                  <div className="flex items-center gap-3">
                    {/* Day number block */}
                    <div className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center text-center shrink-0',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-foreground'
                    )}>
                      <span className="text-[10px] leading-none uppercase font-medium opacity-75">
                        {format(day, 'EEE', { locale: fr }).slice(0, 3)}
                      </span>
                      <span className="text-base sm:text-lg font-bold leading-tight">
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div>
                      <h3 className={cn(
                        'font-display font-semibold text-sm sm:text-base capitalize',
                        isToday && 'text-primary'
                      )}>
                        {format(day, 'EEEE', { locale: fr })}
                        {isToday && (
                          <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium align-middle">
                            Aujourd'hui
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(day, 'd MMMM', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Calorie summary */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{plannedCalories}</span>
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>
                    {dailyTarget > 0 && (
                      <>
                        <p className={cn(
                          'text-[10px] font-medium mt-0.5',
                          gap === 0 ? 'text-muted-foreground' : gap > 0 ? 'text-destructive' : 'text-primary'
                        )}>
                          {gap === 0 ? 'Objectif atteint' : gap > 0 ? `+${gap} kcal` : `${gap} kcal`}
                        </p>
                        {/* Mini progress bar */}
                        <div className="w-20 sm:w-24 h-1 bg-muted rounded-full mt-1.5 ml-auto">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              progress >= 100 ? 'bg-destructive/60' : 'bg-primary/60'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Meals list */}
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  {meals.length === 0 ? (
                    <div className="flex items-center justify-center py-4 text-center">
                      <div>
                        <UtensilsCrossed className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1.5" />
                        <p className="text-xs text-muted-foreground">Aucun repas planifié</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {meals.map(meal => {
                          const recipe = getRecipe(meal.recipeId);
                          if (!recipe) return null;
                          const mealCal = Math.round(recipe.calories * (meal.scaleFactor || 1)) * (meal.portions || 1);
                          const accentClass = MEAL_TYPE_ACCENT[meal.mealType] || '';
                          const iconBg = MEAL_TYPE_ICON_BG[meal.mealType] || 'bg-muted text-muted-foreground';

                          return (
                            <motion.div
                              key={meal.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 8 }}
                              className={cn(
                                accentClass,
                                'group rounded-xl border border-border/50 bg-card transition-all duration-200 hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.05)]',
                                meal.consumed && 'opacity-70'
                              )}
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: `hsl(var(--meal-color))`,
                              }}
                            >
                              <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
                                {/* Meal type indicator */}
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                                  iconBg
                                )}>
                                  {PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType].slice(0, 1).toUpperCase()}
                                </div>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                      {PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType]}
                                    </span>
                                    {meal.isBatchCooking && (
                                      <span className="text-[9px] bg-primary/8 text-primary px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                        <ChefHat className="w-2.5 h-2.5" /> Batch
                                      </span>
                                    )}
                                    {meal.consumed && (
                                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Consommé
                                      </span>
                                    )}
                                  </div>
                                  <p className={cn(
                                    'text-sm font-medium truncate',
                                    meal.consumed && 'line-through decoration-primary/30'
                                  )}>
                                    {recipe.title}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {mealCal} kcal
                                    {(meal.portions || 1) > 1 ? ` · ${meal.portions} portions` : ''}
                                    {meal.scaleFactor && Math.abs(meal.scaleFactor - 1) > 0.01 ? ' · ajusté' : ''}
                                  </p>
                                </div>

                                {/* Actions */}
                                {isMobile ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 rounded-lg opacity-60 group-hover:opacity-100">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                      <DropdownMenuItem onClick={() => handleToggleConsumed(meal.id)}>
                                        {meal.consumed ? <Circle className="w-3.5 h-3.5 mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                                        {meal.consumed ? 'Non consommé' : 'Marquer consommé'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/recipe/${meal.recipeId}${meal.scaleFactor ? `?scale=${meal.scaleFactor}` : ''}`)}>
                                        <Eye className="w-3.5 h-3.5 mr-2" /> Voir la recette
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openDuplicateDialog(meal)}>
                                        <Copy className="w-3.5 h-3.5 mr-2" /> Dupliquer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => removeMeal(meal.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant={meal.consumed ? 'default' : 'outline'}
                                      size="sm"
                                      className={cn(
                                        'h-7 px-2.5 gap-1 text-[11px] rounded-lg',
                                        meal.consumed && 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                      )}
                                      onClick={() => handleToggleConsumed(meal.id)}
                                    >
                                      {meal.consumed ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                      {meal.consumed ? 'Consommé' : 'Consommer'}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] rounded-lg" onClick={() => navigate(`/recipe/${meal.recipeId}${meal.scaleFactor ? `?scale=${meal.scaleFactor}` : ''}`)}>
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] rounded-lg" onClick={() => openDuplicateDialog(meal)}>
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-destructive rounded-lg">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Supprimer ce repas ?</AlertDialogTitle>
                                          <AlertDialogDescription>{recipe.title} sera retiré du planning.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => removeMeal(meal.id)}>Supprimer</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Add meal button */}
                  <button
                    onClick={() => openAddDialog(toDateKey(day))}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 tap-scale"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un repas
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add meal dialog */}
      <Dialog open={!!addDialogDate} onOpenChange={(open) => !open && setAddDialogDate(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Ajouter un repas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-muted/40 rounded-xl p-3.5 text-center">
              <p className="text-xs text-muted-foreground">Jour sélectionné</p>
              <p className="text-sm font-display font-semibold capitalize mt-0.5">{addDialogDateFormatted}</p>
            </div>

            <div>
              <Label className="text-xs font-medium">Type de repas</Label>
              <Select
                value={selectedMealType}
                onValueChange={(value) => {
                  setSelectedMealType(value as Recipe['mealType']);
                  setSelectedRecipeId('');
                }}
              >
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Petit déjeuner</SelectItem>
                  <SelectItem value="lunch">Déjeuner</SelectItem>
                  <SelectItem value="snack">Collation</SelectItem>
                  <SelectItem value="dinner">Dîner</SelectItem>
                </SelectContent>
              </Select>
              {mealSuggestions && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cible : ~{mealSuggestions[selectedMealType]} kcal
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium">Recette</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une recette..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm rounded-xl"
                />
                {recipeSearch && (
                  <button type="button" onClick={() => setRecipeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
                <SelectContent>
                  {filteredRecipes.map(recipe => {
                    const mealTarget = mealSuggestions?.[selectedMealType] || 0;
                    const sf = mealTarget ? getScaleFactor(recipe.calories, mealTarget) : 1;
                    const adjusted = Math.round(recipe.calories * sf);
                    const isScaled = Math.abs(sf - 1) > 0.01;
                    return (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.title} ({adjusted} kcal{isScaled ? ' · ajusté' : ''})
                      </SelectItem>
                    );
                  })}
                  {filteredRecipes.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aucune recette trouvée</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Portions</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={portions}
                onChange={e => setPortions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="mt-1 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
              <Checkbox
                checked={isBatchCooking}
                onCheckedChange={(checked) => {
                  const enabled = !!checked;
                  setIsBatchCooking(enabled);
                  if (!enabled) { setBatchDays([]); setBatchMealTypes([]); return; }
                  if (addDialogDate) setBatchDays(prev => (prev.length > 0 ? prev : [addDialogDate]));
                  setBatchMealTypes(prev => (prev.length > 0 ? prev : [selectedMealType]));
                }}
                id="batch-planning"
              />
              <label htmlFor="batch-planning" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <ChefHat className="w-4 h-4 text-primary" />
                Batch cooking
              </label>
            </div>

            {isBatchCooking && (
              <>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Repas concernés</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PLANNING_MEAL_TYPE_ORDER.map(type => {
                      const isSelected = batchMealTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleBatchMealType(type)}
                          className={cn(
                            'text-xs px-3 py-2.5 rounded-xl border text-left transition-all font-medium',
                            isSelected
                              ? 'bg-primary/8 border-primary/30 text-primary'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {PLANNING_MEAL_TYPE_LABELS[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-2 block">Jours concernés</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                    {batchSelectableDays.map(day => {
                      const selected = batchDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleBatchDay(day)}
                          className={cn(
                            'text-xs px-3 py-2 rounded-xl border text-left capitalize transition-all',
                            selected
                              ? 'bg-primary/8 border-primary/30 text-primary font-medium'
                              : 'bg-card border-border text-foreground hover:bg-muted'
                          )}
                        >
                          {format(new Date(`${day}T12:00:00`), 'EEE d MMM', { locale: fr })}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                    <p>
                      {batchDays.length} jour{batchDays.length > 1 ? 's' : ''} × {batchSelectedMealTypes.length} repas = {batchTotalOccurrences} occurrence{batchTotalOccurrences > 1 ? 's' : ''}
                    </p>
                    <p>
                      Total à préparer : {batchTotalPortions} portion{batchTotalPortions > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Button
              className="w-full tap-scale rounded-xl h-10"
              onClick={handleQuickAdd}
              disabled={!selectedRecipeId || (isBatchCooking && (batchDays.length === 0 || batchSelectedMealTypes.length === 0))}
            >
              {isBatchCooking
                ? `Planifier ${batchTotalOccurrences} repas`
                : 'Ajouter au planning'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={!!duplicateSourceMeal} onOpenChange={(open) => !open && setDuplicateSourceMeal(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Dupliquer un repas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-muted/40 rounded-xl p-3.5">
              <p className="text-sm font-display font-semibold">{duplicateRecipe?.title || 'Repas'}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Depuis {duplicateSourceMeal ? format(new Date(`${duplicateSourceMeal.date}T12:00:00`), 'EEEE d MMMM', { locale: fr }) : ''}
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">Copier sur ces jours</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                {duplicateSelectableDays.map(day => {
                  const selected = duplicateDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDuplicateDay(day)}
                      className={cn(
                        'text-xs px-3 py-2 rounded-xl border text-left capitalize transition-all',
                        selected
                          ? 'bg-primary/8 border-primary/30 text-primary font-medium'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {format(new Date(`${day}T12:00:00`), 'EEE d MMM', { locale: fr })}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {duplicateDays.length} jour{duplicateDays.length > 1 ? 's' : ''} sélectionné{duplicateDays.length > 1 ? 's' : ''}
              </p>
            </div>

            <Button className="w-full tap-scale rounded-xl h-10" onClick={confirmDuplicate} disabled={duplicateDays.length === 0}>
              Dupliquer le repas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
