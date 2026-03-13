import { useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem, Recipe } from '@/data/types';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Copy, ChefHat, Trash2, Plus, Flame } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 Petit déj.',
  lunch: '☀️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation',
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'border-l-accent',
  lunch: 'border-l-primary',
  dinner: 'border-l-secondary',
  snack: 'border-l-muted-foreground',
};

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Planning() {
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialogDate, setAddDialogDate] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<string>('lunch');
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);

  const weekStart = useMemo(() => {
    const now = new Date();
    return addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Filter recipes by selected meal type (strict: breakfast only shows breakfast recipes, lunch/dinner show lunch+dinner)
  const filteredRecipes = useMemo(() => {
    if (selectedMealType === 'breakfast') {
      return allRecipes.filter(r => r.mealType === 'breakfast');
    }
    if (selectedMealType === 'snack') {
      return allRecipes.filter(r => r.mealType === 'breakfast'); // snacks can use breakfast-type recipes
    }
    // lunch and dinner can share recipes
    return allRecipes.filter(r => r.mealType === 'lunch' || r.mealType === 'dinner');
  }, [allRecipes, selectedMealType]);

  const getMealsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const meals = mealPlan.filter(m => m.date === dateStr);
    return meals.sort((a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType));
  };

  const getRecipe = (id: string) => allRecipes.find(r => r.id === id);

  const removeMeal = (id: string) => {
    setMealPlan(prev => prev.filter(m => m.id !== id));
    toast({ title: '🗑️ Repas supprimé' });
  };

  const duplicateMeal = (item: MealPlanItem) => {
    const nextDay = format(addDays(new Date(item.date), 1), 'yyyy-MM-dd');
    setMealPlan(prev => [...prev, { ...item, id: `mp_${Date.now()}`, date: nextDay }]);
    toast({ title: '📋 Repas dupliqué', description: 'Copié au jour suivant' });
  };

  const toggleBatchCooking = (id: string) => {
    setMealPlan(prev => prev.map(m => m.id === id ? { ...m, isBatchCooking: !m.isBatchCooking } : m));
  };

  const openAddDialog = (dateStr: string) => {
    setAddDialogDate(dateStr);
    setSelectedMealType('lunch');
    setSelectedRecipeId('');
    setPortions(1);
    setIsBatchCooking(false);
  };

  const handleQuickAdd = () => {
    if (!addDialogDate || !selectedRecipeId) return;
    const recipe = getRecipe(selectedRecipeId);
    if (!recipe) return;
    const item: MealPlanItem = {
      id: `mp_${Date.now()}`,
      date: addDialogDate,
      mealType: selectedMealType as MealPlanItem['mealType'],
      recipeId: selectedRecipeId,
      isBatchCooking,
      portions,
    };
    setMealPlan(prev => [...prev, item]);
    setAddDialogDate(null);
    toast({ title: '✅ Repas ajouté', description: `${recipe.title} — ${format(new Date(addDialogDate + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}` });
  };

  const getDayCalories = (date: Date) => {
    const meals = getMealsForDay(date);
    return meals.reduce((sum, m) => {
      const recipe = getRecipe(m.recipeId);
      return sum + (recipe ? recipe.calories * (m.portions || 1) : 0);
    }, 0);
  };

  const addDialogDateFormatted = addDialogDate
    ? format(new Date(addDialogDate + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })
    : '';

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
            const dayCalories = getDayCalories(day);
            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className={`card-elevated p-4 transition-shadow duration-200 hover:shadow-md ${isToday ? 'ring-2 ring-primary/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-display font-semibold text-sm capitalize ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'EEEE d MMMM', { locale: fr })}
                    {isToday && <span className="ml-2 text-xs font-normal text-primary">(aujourd'hui)</span>}
                  </h3>
                  {dayCalories > 0 && (
                    <span className="text-xs font-medium text-accent flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {dayCalories} kcal
                    </span>
                  )}
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
                            className={`flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 border-l-3 ${MEAL_TYPE_COLORS[meal.mealType] || ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {meal.isBatchCooking && <ChefHat className="w-4 h-4 text-secondary shrink-0" />}
                              <span className="text-xs text-muted-foreground w-20 shrink-0">
                                {MEAL_TYPE_LABELS[meal.mealType]}
                              </span>
                              <span className="text-sm font-medium truncate">{recipe.title}</span>
                              {(meal.portions || 1) > 1 && <span className="text-xs text-muted-foreground">×{meal.portions}</span>}
                              <span className="text-xs text-muted-foreground">{recipe.calories * (meal.portions || 1)} kcal</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleBatchCooking(meal.id)}>
                                    <ChefHat className={`w-3.5 h-3.5 ${meal.isBatchCooking ? 'text-secondary' : 'text-muted-foreground'}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Batch cooking</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMeal(meal)}>
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Dupliquer au jour suivant</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Supprimer</TooltipContent>
                                </Tooltip>
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
                  onClick={() => openAddDialog(format(day, 'yyyy-MM-dd'))}
                >
                  <Plus className="w-4 h-4" /> Ajouter un repas
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!addDialogDate} onOpenChange={(open) => !open && setAddDialogDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Ajouter un repas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Show selected date prominently */}
            <div className="card-elevated p-3 text-center">
              <p className="text-sm font-display font-semibold capitalize">{addDialogDateFormatted}</p>
            </div>

            <div>
              <Label className="text-xs font-medium">Type de repas</Label>
              <Select value={selectedMealType} onValueChange={(v) => { setSelectedMealType(v); setSelectedRecipeId(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Petit déjeuner</SelectItem>
                  <SelectItem value="lunch">Déjeuner</SelectItem>
                  <SelectItem value="dinner">Dîner</SelectItem>
                  <SelectItem value="snack">Collation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Recette</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une recette" /></SelectTrigger>
                <SelectContent>
                  {filteredRecipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title} ({r.calories} kcal)</SelectItem>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aucune recette pour ce type</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Nombre de portions</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={portions}
                onChange={e => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox checked={isBatchCooking} onCheckedChange={(c) => setIsBatchCooking(!!c)} id="batch-planning" />
              <label htmlFor="batch-planning" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <ChefHat className="w-4 h-4 text-secondary" /> Batch cooking
              </label>
            </div>

            <Button className="w-full tap-scale" onClick={handleQuickAdd} disabled={!selectedRecipeId}>
              Ajouter au planning
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
