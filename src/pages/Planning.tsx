import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { MealPlanItem, Recipe } from '@/data/types';
import { calculateCalorieTarget, getMealCalorieSuggestion } from '@/lib/calories';
import { getScaleFactor } from '@/lib/recipeScaling';
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
import { ChevronLeft, ChevronRight, Copy, ChefHat, Trash2, Plus, Target, MoreVertical, Eye, CheckCircle2, Circle, Search, X } from 'lucide-react';
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

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'border-l-accent',
  lunch: 'border-l-primary',
  dinner: 'border-l-secondary',
  snack: 'border-l-muted-foreground',
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
      toast({ title: '🗑️ Repas retiré du planning' });
    } catch {
      toast({ title: '❌ Erreur', variant: 'destructive' });
    }
  };

  const handleToggleConsumed = async (id: string) => {
    try {
      await toggleConsumed(id);
    } catch {
      toast({ title: '❌ Erreur', variant: 'destructive' });
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
        toast({ title: '⚠️ Aucun jour sélectionné', variant: 'destructive' });
        return;
      }
      if (batchSelectedMealTypes.length === 0) {
        toast({ title: '⚠️ Aucun repas sélectionné', variant: 'destructive' });
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
          title: '✅ Batch cooking planifié',
          description: `${recipe.title} · ${selectedDates.length} jour${selectedDates.length > 1 ? 's' : ''} × ${batchSelectedMealTypes.length} repas (${mealLabels}) · ${batchTotalPortions} portion${batchTotalPortions > 1 ? 's' : ''}`,
        });
      } catch {
        toast({ title: '❌ Erreur', variant: 'destructive' });
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
          title: '✅ Repas ajouté',
          description: `${recipe.title} — ${Math.round(recipe.calories * sf)} kcal`,
        });
      } catch {
        toast({ title: '❌ Erreur', variant: 'destructive' });
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
      toast({ title: '📋 Repas dupliqué', description: `Ajouté sur ${duplicateDays.length} jour${duplicateDays.length > 1 ? 's' : ''}` });
    } catch {
      toast({ title: '❌ Erreur', variant: 'destructive' });
    }
  };

  const addDialogDateFormatted = addDialogDate
    ? format(new Date(`${addDialogDate}T12:00:00`), 'EEEE d MMMM', { locale: fr })
    : '';

  const duplicateRecipe = duplicateSourceMeal ? getRecipe(duplicateSourceMeal.recipeId) : null;

  const gapColor = (gap: number) =>
    gap > 0 ? 'text-secondary' : gap < 0 ? 'text-destructive' : 'text-muted-foreground';
  const gapBg = (gap: number) =>
    gap > 0 ? 'bg-secondary/10 text-secondary' : gap < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground';

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Planning</h1>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="tap-scale h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>
              Semaine
            </Button>
            <Button variant="outline" size="icon" className="tap-scale h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {mealSuggestions && target && (
          <div className="card-elevated p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Répartition — {target.target} kcal/jour
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md">Pdj {mealSuggestions.breakfast}</span>
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md">Déj {mealSuggestions.lunch}</span>
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md">Coll {mealSuggestions.snack}</span>
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md">Dîner {mealSuggestions.dinner}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {days.map((day, i) => {
            const meals = getMealsForDay(day);
            const isToday = isSameDay(day, new Date());
            const plannedCalories = getDayCalories(day);
            const dailyTarget = target?.target || 0;
            const gap = plannedCalories - dailyTarget;

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className={cn('card-elevated p-3 sm:p-4', isToday && 'ring-2 ring-primary/30')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn('font-display font-semibold text-sm capitalize', isToday && 'text-primary')}>
                    {isMobile
                      ? format(day, 'EEE d MMM', { locale: fr })
                      : format(day, 'EEEE d MMMM', { locale: fr })
                    }
                    {isToday && <span className="ml-1.5 text-[10px] font-normal text-primary">(auj.)</span>}
                  </h3>
                </div>

                {/* Day summary badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {plannedCalories} kcal
                  </span>
                  {dailyTarget > 0 && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', gapBg(gap))}>
                      {gap > 0 ? '+' : ''}{gap}
                    </span>
                  )}
                </div>

                {meals.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-2 italic">Aucun repas prévu — ajoute-en un ci-dessous.</p>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    <AnimatePresence>
                      {meals.map(meal => {
                        const recipe = getRecipe(meal.recipeId);
                        if (!recipe) return null;
                        const mealCal = Math.round(recipe.calories * (meal.scaleFactor || 1)) * (meal.portions || 1);

                        return (
                          <motion.div
                            key={meal.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            className={cn('bg-muted/50 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border-l-4', MEAL_TYPE_COLORS[meal.mealType] || '', meal.consumed && 'ring-1 ring-secondary/40')}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType]}
                                  </span>
                                  {meal.isBatchCooking && (
                                    <ChefHat className="w-3 h-3 text-secondary" />
                                  )}
                                  {meal.consumed && (
                                    <span className="text-[9px] bg-secondary/15 text-secondary px-1.5 rounded-full font-medium">✓ consommé</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{recipe.title}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {mealCal} kcal
                                  {(meal.portions || 1) > 1 ? ` · ${meal.portions}p` : ''}
                                  {meal.scaleFactor && Math.abs(meal.scaleFactor - 1) > 0.01 ? ' · ajusté' : ''}
                                </p>
                              </div>

                              {/* Desktop: inline buttons. Mobile: dropdown menu */}
                              {isMobile ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
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
                                <div className="flex gap-1 shrink-0">
                                  <Button
                                    variant={meal.consumed ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn('h-7 px-2 gap-1 text-xs', meal.consumed && 'bg-secondary hover:bg-secondary/80 text-secondary-foreground')}
                                    onClick={() => handleToggleConsumed(meal.id)}
                                  >
                                    {meal.consumed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                                    {meal.consumed ? 'Consommé' : 'Consommer'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={() => navigate(`/recipe/${meal.recipeId}${meal.scaleFactor ? `?scale=${meal.scaleFactor}` : ''}`)}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Voir
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={() => openDuplicateDialog(meal)}
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Dupliquer
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs text-destructive">
                                        <Trash2 className="w-3.5 h-3.5" />
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

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-primary tap-scale w-full justify-center text-xs"
                  onClick={() => openAddDialog(toDateKey(day))}
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un repas
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add meal dialog */}
      <Dialog open={!!addDialogDate} onOpenChange={(open) => !open && setAddDialogDate(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter un repas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="card-elevated p-3 text-center">
              <p className="text-sm font-display font-semibold capitalize">{addDialogDateFormatted}</p>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Petit déjeuner</SelectItem>
                  <SelectItem value="lunch">Déjeuner</SelectItem>
                  <SelectItem value="snack">Collation</SelectItem>
                  <SelectItem value="dinner">Dîner</SelectItem>
                </SelectContent>
              </Select>
              {mealSuggestions && (
                <p className="text-xs text-muted-foreground mt-1">
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
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {recipeSearch && (
                  <button type="button" onClick={() => setRecipeSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
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
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-3">
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
                <ChefHat className="w-4 h-4 text-secondary" />
                Batch cooking (multi-jours & créneaux)
              </label>
            </div>

            {isBatchCooking && (
              <>
                {/* Meal type multi-select */}
                <div>
                  <Label className="text-xs font-medium mb-1 block">Repas concernés</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">Sélectionne les repas sur lesquels tu veux prévoir cette préparation.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PLANNING_MEAL_TYPE_ORDER.map(type => {
                      const isSelected = batchMealTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleBatchMealType(type)}
                          className={cn(
                            'text-xs px-3 py-2 rounded-lg border text-left transition-colors',
                            isSelected
                              ? 'bg-secondary/10 border-secondary text-secondary font-medium'
                              : 'bg-card border-border text-foreground hover:bg-muted'
                          )}
                        >
                          {PLANNING_MEAL_TYPE_LABELS[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day multi-select */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Jours à planifier</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                    {batchSelectableDays.map(day => {
                      const selected = batchDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleBatchDay(day)}
                          className={cn(
                            'text-xs px-3 py-2 rounded-lg border text-left capitalize transition-colors',
                            selected
                              ? 'bg-primary/10 border-primary text-primary font-medium'
                              : 'bg-card border-border text-foreground hover:bg-muted'
                          )}
                        >
                          {format(new Date(`${day}T12:00:00`), 'EEE d MMM', { locale: fr })}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>
                      {batchDays.length} jour{batchDays.length > 1 ? 's' : ''} × {batchSelectedMealTypes.length} créneau{batchSelectedMealTypes.length > 1 ? 'x' : ''} = {batchTotalOccurrences} occurrence{batchTotalOccurrences > 1 ? 's' : ''}
                    </p>
                    <p>
                      Quantité totale à préparer : {batchTotalPortions} portion{batchTotalPortions > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground bg-muted/60 rounded-md p-2 space-y-1">
              <p><strong>Portions</strong> = quantité par occurrence.</p>
              <p><strong>Dupliquer</strong> = copier un repas existant.</p>
              <p><strong>Batch cooking</strong> = planifier sur plusieurs jours et créneaux.</p>
            </div>

            <Button
              className="w-full tap-scale"
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Dupliquer un repas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="card-elevated p-3">
              <p className="text-sm font-display font-semibold">{duplicateRecipe?.title || 'Repas'}</p>
              <p className="text-xs text-muted-foreground">
                Depuis {duplicateSourceMeal ? format(new Date(`${duplicateSourceMeal.date}T12:00:00`), 'EEEE d MMMM', { locale: fr }) : ''}
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">Jours de duplication</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                {duplicateSelectableDays.map(day => {
                  const selected = duplicateDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDuplicateDay(day)}
                      className={cn(
                        'text-xs px-3 py-2 rounded-lg border text-left capitalize transition-colors',
                        selected
                          ? 'bg-primary/10 border-primary text-primary font-medium'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {format(new Date(`${day}T12:00:00`), 'EEE d MMM', { locale: fr })}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {duplicateDays.length} jour(s) sélectionné(s)
              </p>
            </div>

            <Button className="w-full" onClick={confirmDuplicate} disabled={duplicateDays.length === 0}>
              Confirmer la duplication
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
