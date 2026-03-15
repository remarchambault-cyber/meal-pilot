import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, ChefHat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MealPlanItem, Recipe } from '@/data/types';
import { toast } from '@/hooks/use-toast';
import { getCompatibleMealTypesForRecipe, PLANNING_MEAL_TYPE_LABELS, PLANNING_MEAL_TYPE_ORDER } from '@/lib/mealTypes';
import { getScaleFactor, scaleRecipe } from '@/lib/recipeScaling';

interface AddToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  mealTargets?: Record<string, number> | null;
  onAdd: (items: MealPlanItem[]) => void;
}

export default function AddToPlanModal({ open, onOpenChange, recipe, mealTargets, onAdd }: AddToPlanModalProps) {
  const compatibleTypes = getCompatibleMealTypesForRecipe(recipe);
  const [date, setDate] = useState<Date>(new Date());
  const [mealType, setMealType] = useState<MealPlanItem['mealType']>(compatibleTypes[0]);
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);
  const [batchDays, setBatchDays] = useState<string[]>([]);
  const [batchMealTypes, setBatchMealTypes] = useState<MealPlanItem['mealType'][]>([]);

  // All 4 meal types available for batch cooking
  const allMealTypes = PLANNING_MEAL_TYPE_ORDER;

  useEffect(() => {
    if (!open) return;
    const defaultDate = new Date();
    const defaultDay = format(defaultDate, 'yyyy-MM-dd');
    const defaultMealType = getCompatibleMealTypesForRecipe(recipe)[0];

    setDate(defaultDate);
    setMealType(defaultMealType);
    setPortions(1);
    setIsBatchCooking(false);
    setBatchDays([defaultDay]);
    setBatchMealTypes([defaultMealType]);
  }, [open, recipe]);

  const scaleFactor = useMemo(() => {
    if (!mealTargets) return 1;
    const target = mealTargets[isBatchCooking && batchMealTypes.length > 0 ? batchMealTypes[0] : mealType];
    if (!target) return 1;
    return getScaleFactor(recipe.calories, target);
  }, [mealTargets, mealType, isBatchCooking, batchMealTypes, recipe.calories]);

  const scaled = useMemo(() => scaleRecipe(recipe, scaleFactor), [recipe, scaleFactor]);

  const nextDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => format(addDays(date, i), 'yyyy-MM-dd'));
  }, [date]);

  const toggleBatchDay = (day: string) => {
    setBatchDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const toggleBatchMealType = (type: MealPlanItem['mealType']) => {
    setBatchMealTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleBatchMode = (checked: boolean) => {
    setIsBatchCooking(checked);
    if (!checked) {
      setBatchDays([]);
      setBatchMealTypes([]);
      return;
    }
    const currentDay = format(date, 'yyyy-MM-dd');
    setBatchDays(prev => (prev.length > 0 ? prev : [currentDay]));
    setBatchMealTypes(prev => (prev.length > 0 ? prev : [mealType]));
  };

  const selectedDays = useMemo(() => [...batchDays].sort((a, b) => a.localeCompare(b)), [batchDays]);
  const selectedMealTypes = useMemo(
    () => allMealTypes.filter(t => batchMealTypes.includes(t)),
    [batchMealTypes, allMealTypes]
  );

  const totalOccurrences = isBatchCooking ? selectedDays.length * selectedMealTypes.length : 1;
  const totalPortions = totalOccurrences * portions;

  const handleAdd = () => {
    const singleDay = format(date, 'yyyy-MM-dd');

    if (isBatchCooking) {
      if (selectedDays.length === 0) {
        toast({ title: '⚠️ Aucun jour sélectionné', description: 'Sélectionne au moins un jour.', variant: 'destructive' });
        return;
      }
      if (selectedMealTypes.length === 0) {
        toast({ title: '⚠️ Aucun créneau sélectionné', description: 'Sélectionne au moins un type de repas.', variant: 'destructive' });
        return;
      }

      const items: MealPlanItem[] = [];
      let idx = 0;
      for (const day of selectedDays) {
        for (const mt of selectedMealTypes) {
          items.push({
            id: `mp_${Date.now()}_${day.replace(/-/g, '')}_${mt}_${idx++}`,
            date: day,
            mealType: mt,
            recipeId: recipe.id,
            isBatchCooking: true,
            portions,
            scaleFactor,
          });
        }
      }

      onAdd(items);
      onOpenChange(false);

      const mealLabels = selectedMealTypes.map(t => PLANNING_MEAL_TYPE_LABELS[t]).join(', ');
      toast({
        title: '✅ Batch cooking planifié',
        description: `${recipe.title} · ${selectedDays.length} jour${selectedDays.length > 1 ? 's' : ''} × ${selectedMealTypes.length} créneau${selectedMealTypes.length > 1 ? 'x' : ''} (${mealLabels}) · ${totalPortions} portion${totalPortions > 1 ? 's' : ''} au total`,
      });
    } else {
      const items: MealPlanItem[] = [{
        id: `mp_${Date.now()}_${singleDay.replace(/-/g, '')}_0`,
        date: singleDay,
        mealType,
        recipeId: recipe.id,
        isBatchCooking: false,
        portions,
        scaleFactor,
      }];

      onAdd(items);
      onOpenChange(false);

      toast({
        title: '✅ Repas ajouté au planning',
        description: `${recipe.title} — ${scaled.calories} kcal · ${format(date, 'EEEE d MMMM', { locale: fr })}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter au planning</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="card-elevated p-3">
            <p className="font-display font-semibold text-sm">{recipe.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{scaled.calories} kcal · {recipe.prepTime} min</span>
              {scaled.isScaled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Portion ajustée
                </span>
              )}
            </div>
            {scaled.isScaled && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Base : {recipe.calories} kcal → Ajusté : {scaled.calories} kcal · P {scaled.protein}g · G {scaled.carbs}g · L {scaled.fat}g
              </p>
            )}
          </div>

          <div className="card-elevated p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Jour sélectionné</p>
            <p className="text-sm font-medium capitalize">{format(date, 'EEEE d MMMM yyyy', { locale: fr })}</p>
            {isBatchCooking && (
              <p className="text-xs text-muted-foreground">
                Batch cooking actif · {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} × {selectedMealTypes.length} repas
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal mt-1')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (!d) return;
                    setDate(d);
                    if (isBatchCooking) {
                      const dayKey = format(d, 'yyyy-MM-dd');
                      setBatchDays(prev => (prev.length > 0 ? prev : [dayKey]));
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Single meal type selector (non-batch mode) */}
          {!isBatchCooking && (
            <div>
              <Label className="text-xs font-medium">Type de repas</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealPlanItem['mealType'])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {compatibleTypes.map(type => (
                    <SelectItem key={type} value={type}>{PLANNING_MEAL_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mealTargets && mealTargets[mealType] && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cible pour ce créneau : ~{mealTargets[mealType]} kcal
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Portions par occurrence</Label>
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
              onCheckedChange={(checked) => toggleBatchMode(!!checked)}
              id="batch"
            />
            <label htmlFor="batch" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <ChefHat className="w-4 h-4 text-secondary" /> Batch cooking (multi-jours & créneaux)
            </label>
          </div>

          {isBatchCooking && (
            <>
              {/* Meal type multi-select */}
              <div>
                <Label className="text-xs font-medium mb-1 block">Repas concernés</Label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Sélectionne les repas sur lesquels tu veux prévoir cette préparation.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {allMealTypes.map(type => {
                    const isSelected = batchMealTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleBatchMealType(type)}
                        className={cn(
                          'text-xs px-3 py-2.5 rounded-lg border text-left transition-colors font-medium',
                          isSelected
                            ? 'bg-secondary/10 border-secondary text-secondary ring-1 ring-secondary/30'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
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
                <Label className="text-xs font-medium mb-2 block">Jours concernés</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                  {nextDays.map(day => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleBatchDay(day)}
                        className={cn(
                          'text-xs px-3 py-2 rounded-lg border text-left capitalize transition-colors',
                          isSelected
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
                    {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} × {selectedMealTypes.length} créneau{selectedMealTypes.length > 1 ? 'x' : ''} = {totalOccurrences} occurrence{totalOccurrences > 1 ? 's' : ''}
                  </p>
                  <p>
                    Quantité totale à préparer : {totalPortions} portion{totalPortions > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </>
          )}

          <Button
            className="w-full gap-2 tap-scale"
            onClick={handleAdd}
            disabled={isBatchCooking && (selectedDays.length === 0 || selectedMealTypes.length === 0)}
          >
            {isBatchCooking
              ? `Planifier ${totalOccurrences} repas`
              : 'Ajouter au planning'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
