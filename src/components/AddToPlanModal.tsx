import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
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

interface AddToPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  onAdd: (items: MealPlanItem[]) => void;
}

function getCompatibleMealTypes(recipe: Recipe): MealPlanItem['mealType'][] {
  if (recipe.mealType === 'breakfast') {
    return ['breakfast', 'snack'];
  }
  return ['lunch', 'dinner'];
}

export default function AddToPlanModal({ open, onOpenChange, recipe, onAdd }: AddToPlanModalProps) {
  const compatibleTypes = getCompatibleMealTypes(recipe);
  const [date, setDate] = useState<Date>(new Date());
  const [mealType, setMealType] = useState<MealPlanItem['mealType']>(compatibleTypes[0]);
  const [portions, setPortions] = useState(1);
  const [isBatchCooking, setIsBatchCooking] = useState(false);
  const [batchDays, setBatchDays] = useState<Date[]>([]);

  // Generate next 14 days for batch cooking selection
  const nextDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  const toggleBatchDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    setBatchDays(prev => {
      const exists = prev.some(d => format(d, 'yyyy-MM-dd') === dayStr);
      if (exists) return prev.filter(d => format(d, 'yyyy-MM-dd') !== dayStr);
      return [...prev, day];
    });
  };

  const handleAdd = () => {
    if (isBatchCooking && batchDays.length > 0) {
      // Batch cooking: add to all selected days
      const items: MealPlanItem[] = batchDays.map(d => ({
        id: `mp_${Date.now()}_${format(d, 'yyyyMMdd')}`,
        date: format(d, 'yyyy-MM-dd'),
        mealType,
        recipeId: recipe.id,
        isBatchCooking: true,
        portions,
      }));
      onAdd(items);
      onOpenChange(false);
      toast({
        title: '✅ Batch cooking ajouté',
        description: `${recipe.title} ajouté sur ${batchDays.length} jours`,
      });
    } else {
      // Single day add
      const item: MealPlanItem = {
        id: `mp_${Date.now()}`,
        date: format(date, 'yyyy-MM-dd'),
        mealType,
        recipeId: recipe.id,
        isBatchCooking: false,
        portions,
      };
      onAdd([item]);
      onOpenChange(false);
      toast({
        title: '✅ Repas ajouté au planning',
        description: `${recipe.title} — ${format(date, 'EEEE d MMMM', { locale: fr })}`,
      });
    }
  };

  const MEAL_LABELS: Record<string, string> = {
    breakfast: 'Petit déjeuner',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Collation',
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

          {/* Batch cooking toggle */}
          <div className="flex items-center gap-3">
            <Checkbox checked={isBatchCooking} onCheckedChange={(c) => { setIsBatchCooking(!!c); if (!c) setBatchDays([]); }} id="batch" />
            <label htmlFor="batch" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <ChefHat className="w-4 h-4 text-secondary" /> Batch cooking (plusieurs jours)
            </label>
          </div>

          {!isBatchCooking && (
            <div>
              <Label className="text-xs font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'EEEE d MMMM yyyy', { locale: fr }) : 'Choisir une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {isBatchCooking && (
            <div>
              <Label className="text-xs font-medium mb-2 block">Sélectionner les jours</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {nextDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const isSelected = batchDays.some(d => format(d, 'yyyy-MM-dd') === dayStr);
                  return (
                    <button
                      key={dayStr}
                      type="button"
                      onClick={() => toggleBatchDay(day)}
                      className={cn(
                        "text-xs px-3 py-2 rounded-lg border text-left capitalize transition-colors",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-card border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {format(day, 'EEE d MMM', { locale: fr })}
                    </button>
                  );
                })}
              </div>
              {batchDays.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {batchDays.length} jour{batchDays.length > 1 ? 's' : ''} sélectionné{batchDays.length > 1 ? 's' : ''} · Total à préparer : {portions * batchDays.length} portion{portions * batchDays.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Type de repas</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealPlanItem['mealType'])}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {compatibleTypes.map(type => (
                  <SelectItem key={type} value={type}>{MEAL_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">Portions par repas</Label>
            <Input type="number" min={1} max={10} value={portions} onChange={e => setPortions(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1" />
          </div>

          <Button
            className="w-full gap-2 tap-scale"
            onClick={handleAdd}
            disabled={isBatchCooking && batchDays.length === 0}
          >
            {isBatchCooking
              ? `Ajouter sur ${batchDays.length} jour${batchDays.length > 1 ? 's' : ''}`
              : 'Ajouter au planning'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
