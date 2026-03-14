import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem, Recipe, UserProfile } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
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
import { ChevronLeft, ChevronRight, Copy, ChefHat, Trash2, Plus, Target } from 'lucide-react';
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
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialogDate, setAddDialogDate] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<Recipe['mealType']>('lunch');
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);
  const [batchDays, setBatchDays] = useState<string[]>([]);

  const [duplicateSourceMeal, setDuplicateSourceMeal] = useState<MealPlanItem | null>(null);
  const [duplicateDays, setDuplicateDays] = useState<string[]>([]);

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);
  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);
  const mealSuggestions = useMemo(() => target ? getMealCalorieSuggestion(target.target) : null, [target]);

  const weekStart = useMemo(() => {
    const now = new Date();
    return addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const filteredRecipes = useMemo(
    () => filterRecipesByMealType(allRecipes, selectedMealType),
    [allRecipes, selectedMealType]
  );

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

  const removeMeal = (id: string) => {
    setMealPlan(prev => prev.filter(m => m.id !== id));
    toast({ title: '🗑️ Repas supprimé' });
  };

  const openAddDialog = (dateStr: string) => {
    setAddDialogDate(dateStr);
    setSelectedMealType('lunch');
    setSelectedRecipeId('');
    setPortions(1);
    setIsBatchCooking(false);
    setBatchDays([dateStr]);
  };

  const toggleBatchDay = (day: string) => {
    setBatchDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const toggleDuplicateDay = (day: string) => {
    setDuplicateDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const handleQuickAdd = () => {
    if (!addDialogDate || !selectedRecipeId) return;

    const selectedDates = isBatchCooking
      ? [...batchDays].sort((a, b) => a.localeCompare(b))
      : [addDialogDate];

    if (selectedDates.length === 0) {
      toast({
        title: '⚠️ Aucun jour sélectionné',
        description: 'Sélectionne au moins un jour pour le batch cooking.',
        variant: 'destructive',
      });
      return;
    }

    const recipe = getRecipe(selectedRecipeId);
    if (!recipe) return;

    const items: MealPlanItem[] = selectedDates.map((date, index) => ({
      id: `mp_${Date.now()}_${date.split('-').join('')}_${index}`,
      date,
      mealType: selectedMealType,
      recipeId: selectedRecipeId,
      isBatchCooking,
      portions,
    }));

    setMealPlan(prev => [...prev, ...items]);
    setAddDialogDate(null);

    toast({
      title: isBatchCooking ? '✅ Batch cooking planifié' : '✅ Repas ajouté',
      description: isBatchCooking
        ? `${recipe.title} ajouté sur ${selectedDates.length} jours · ${selectedDates.length * portions} portions au total`
        : `${recipe.title} — ${format(new Date(`${addDialogDate}T12:00:00`), 'EEEE d MMMM', { locale: fr })}`,
    });
  };

  const openDuplicateDialog = (meal: MealPlanItem) => {
    const defaultDuplicateDate = toDateKey(addDays(new Date(`${meal.date}T12:00:00`), 1));
    setDuplicateSourceMeal(meal);
    setDuplicateDays([defaultDuplicateDate]);
  };

  const confirmDuplicate = () => {
    if (!duplicateSourceMeal || duplicateDays.length === 0) return;

    const duplicatedItems: MealPlanItem[] = duplicateDays.map((date, index) => ({
      ...duplicateSourceMeal,
      id: `mp_${Date.now()}_dup_${date.split('-').join('')}_${index}`,
      date,
      isBatchCooking: false,
    }));

    setMealPlan(prev => [...prev, ...duplicatedItems]);
    setDuplicateSourceMeal(null);
    setDuplicateDays([]);

    toast({
      title: '📋 Repas dupliqué',
      description: `${duplicatedItems.length} occurrence${duplicatedItems.length > 1 ? 's' : ''} ajoutée${duplicatedItems.length > 1 ? 's' : ''}`,
    });
  };

  const addDialogDateFormatted = addDialogDate
    ? format(new Date(`${addDialogDate}T12:00:00`), 'EEEE d MMMM', { locale: fr })
    : '';

  const duplicateRecipe = duplicateSourceMeal ? getRecipe(duplicateSourceMeal.recipeId) : null;

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

        {mealSuggestions && target && (
          <div className="card-elevated p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Répartition suggérée — {target.target} kcal/jour
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-muted px-2 py-1 rounded-md">Petit déjeuner {mealSuggestions.breakfast} kcal</span>
              <span className="text-xs bg-muted px-2 py-1 rounded-md">Déjeuner {mealSuggestions.lunch} kcal</span>
              <span className="text-xs bg-muted px-2 py-1 rounded-md">Collation {mealSuggestions.snack} kcal</span>
              <span className="text-xs bg-muted px-2 py-1 rounded-md">Dîner {mealSuggestions.dinner} kcal</span>
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

            const gapStyle = gap < -250
              ? 'bg-destructive/10 text-destructive'
              : gap > 250
                ? 'bg-accent/10 text-accent'
                : 'bg-secondary/10 text-secondary';

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className={cn('card-elevated p-4', isToday && 'ring-2 ring-primary/30')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn('font-display font-semibold text-sm capitalize', isToday && 'text-primary')}>
                    {format(day, 'EEEE d MMMM', { locale: fr })}
                    {isToday && <span className="ml-2 text-xs font-normal text-primary">(aujourd'hui)</span>}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    Planifié : {plannedCalories} kcal
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    Objectif : {dailyTarget || '—'} kcal
                  </span>
                  <span className={cn('text-[11px] px-2 py-1 rounded-md font-medium', gapStyle)}>
                    Écart : {gap > 0 ? '+' : ''}{gap} kcal
                  </span>
                </div>

                {meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-2">Aucun repas planifié</p>
                ) : (
                  <div className="space-y-2 mb-2">
                    <AnimatePresence>
                      {meals.map(meal => {
                        const recipe = getRecipe(meal.recipeId);
                        if (!recipe) return null;

                        return (
                          <motion.div
                            key={meal.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            className={cn('bg-muted/50 rounded-lg px-3 py-2 border-l-4', MEAL_TYPE_COLORS[meal.mealType] || '')}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">
                                    {PLANNING_MEAL_TYPE_LABELS_SHORT[meal.mealType]}
                                  </span>
                                  {meal.isBatchCooking && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium inline-flex items-center gap-1">
                                      <ChefHat className="w-3 h-3" /> Batch
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">{recipe.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {meal.portions || 1} portion{(meal.portions || 1) > 1 ? 's' : ''} · {Math.round(recipe.calories * (meal.scaleFactor || 1)) * (meal.portions || 1)} kcal
                                  {meal.scaleFactor && Math.abs(meal.scaleFactor - 1) > 0.01 ? ` · ajusté ×${meal.scaleFactor.toFixed(2)}` : ''}
                                </p>
                              </div>

                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs"
                                  onClick={() => openDuplicateDialog(meal)}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Dupliquer
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs text-destructive">
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Supprimer
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer ce repas ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {recipe.title} sera retiré du planning.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => removeMeal(meal.id)}>Supprimer</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
                  className="gap-1.5 text-muted-foreground hover:text-primary tap-scale w-full justify-center"
                  onClick={() => openAddDialog(toDateKey(day))}
                >
                  <Plus className="w-4 h-4" /> Ajouter un repas
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

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
                  <SelectItem value="dinner">Dîner</SelectItem>
                </SelectContent>
              </Select>
              {mealSuggestions && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cible suggérée : ~{mealSuggestions[selectedMealType]} kcal
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium">Recette (filtrée strictement par type)</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
                <SelectContent>
                  {filteredRecipes.map(recipe => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.title} ({recipe.calories} kcal)
                    </SelectItem>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aucune recette pour ce type</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Portions (pour chaque jour sélectionné)</Label>
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
                  if (!enabled) {
                    setBatchDays([]);
                    return;
                  }
                  if (addDialogDate) {
                    setBatchDays(prev => (prev.length > 0 ? prev : [addDialogDate]));
                  }
                }}
                id="batch-planning"
              />
              <label htmlFor="batch-planning" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <ChefHat className="w-4 h-4 text-secondary" />
                Batch cooking (planification multi-jours)
              </label>
            </div>

            {isBatchCooking && (
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

                <p className="text-xs text-muted-foreground mt-2">
                  {batchDays.length} jour{batchDays.length > 1 ? 's' : ''} sélectionné{batchDays.length > 1 ? 's' : ''}
                  {' · '}
                  {batchDays.length * portions} portion{batchDays.length * portions > 1 ? 's' : ''} au total
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/60 rounded-md p-2 space-y-1">
              <p><strong>Portions</strong> = quantité pour un jour.</p>
              <p><strong>Dupliquer</strong> = copier un repas existant vers d'autres jours.</p>
              <p><strong>Batch cooking</strong> = planifier en une action sur plusieurs jours.</p>
            </div>

            <Button
              className="w-full tap-scale"
              onClick={handleQuickAdd}
              disabled={!selectedRecipeId || (isBatchCooking && batchDays.length === 0)}
            >
              {isBatchCooking
                ? `Ajouter sur ${batchDays.length} jour${batchDays.length > 1 ? 's' : ''}`
                : 'Ajouter au planning'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Label className="text-xs font-medium mb-2 block">Sélectionner les jours de duplication</Label>
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
                {duplicateDays.length} jour{duplicateDays.length > 1 ? 's' : ''} sélectionné{duplicateDays.length > 1 ? 's' : ''}
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
