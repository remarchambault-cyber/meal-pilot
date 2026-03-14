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
import { getCompatibleMealTypesForRecipe, PLANNING_MEAL_TYPE_LABELS } from '@/lib/mealTypes';

interface AddToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  onAdd: (items: MealPlanItem[]) => void;
}

export default function AddToPlanModal({ open, onOpenChange, recipe, onAdd }: AddToPlanModalProps) {
  const compatibleTypes = getCompatibleMealTypesForRecipe(recipe);
  const [date, setDate] = useState<Date>(new Date());
  const [mealType, setMealType] = useState<MealPlanItem['mealType']>(compatibleTypes[0]);
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);
  const [batchDays, setBatchDays] = useState<string[]>([]);

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
  }, [open, recipe]);

  const nextDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => format(addDays(date, i), 'yyyy-MM-dd'));
  }, [date]);

  const toggleBatchDay = (day: string) => {
    setBatchDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const toggleBatchMode = (checked: boolean) => {
    setIsBatchCooking(checked);
    if (!checked) {
      setBatchDays([]);
      return;
    }
    const currentDay = format(date, 'yyyy-MM-dd');
    setBatchDays(prev => (prev.length > 0 ? prev : [currentDay]));
  };

  const selectedDays = useMemo(() => [...batchDays].sort((a, b) => a.localeCompare(b)), [batchDays]);

  const handleAdd = () => {
    const singleDay = format(date, 'yyyy-MM-dd');
    const targetDays = isBatchCooking ? selectedDays : [singleDay];

    if (targetDays.length === 0) {
      toast({
        title: '⚠️ Aucun jour sélectionné',
        description: 'Sélectionne au moins un jour pour le batch cooking.',
        variant: 'destructive',
      });
      return;
    }

    const items: MealPlanItem[] = targetDays.map((day, index) => ({
      id: `mp_${Date.now()}_${day.replaceAll('-', '')}_${index}`,
      date: day,
      mealType,
      recipeId: recipe.id,
      isBatchCooking,
      portions,
    }));

    onAdd(items);
    onOpenChange(false);

    toast({
      title: isBatchCooking ? '✅ Batch cooking planifié' : '✅ Repas ajouté au planning',
      description: isBatchCooking
        ? `${recipe.title} ajouté sur ${targetDays.length} jours · ${targetDays.length * portions} portions au total`
        : `${recipe.title} — ${format(date, 'EEEE d MMMM', { locale: fr })}`,
    });
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
            <p className="text-xs text-muted-foreground">{recipe.calories} kcal · {recipe.prepTime} min</p>
          </div>

          <div className="card-elevated p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Jour sélectionné</p>
            <p className="text-sm font-medium capitalize">{format(date, 'EEEE d MMMM yyyy', { locale: fr })}</p>
            {isBatchCooking && (
              <p className="text-xs text-muted-foreground">
                Batch cooking actif · {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} sélectionné{selectedDays.length > 1 ? 's' : ''}
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
            {compatibleTypes.length === 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Cette recette est strictement catégorisée pour ce type de repas.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium">Portions par jour</Label>
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
              <ChefHat className="w-4 h-4 text-secondary" /> Batch cooking (multi-jours)
            </label>
          </div>

          {isBatchCooking && (
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
                  {selectedDays.length} jour{selectedDays.length > 1 ? 's' : ''} confirmé{selectedDays.length > 1 ? 's' : ''}
                </p>
                <p>
                  Quantité totale à préparer : {selectedDays.length * portions} portion{selectedDays.length * portions > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2 tap-scale"
            onClick={handleAdd}
            disabled={isBatchCooking && selectedDays.length === 0}
          >
            {isBatchCooking
              ? `Ajouter sur ${selectedDays.length} jour${selectedDays.length > 1 ? 's' : ''}`
              : 'Ajouter au planning'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
