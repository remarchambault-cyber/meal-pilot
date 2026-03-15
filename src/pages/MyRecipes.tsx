import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe, RecipeIngredient } from '@/data/types';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Eye, Flame, Clock, CalendarPlus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import AddToPlanModal from '@/components/AddToPlanModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const EMPTY_INGREDIENT: RecipeIngredient = { name: '', quantity: 0, unit: 'g', category: 'other' };

const EMPTY_RECIPE: Omit<Recipe, 'id'> = {
  title: '', description: '', mealType: 'lunch', calories: 0, protein: 0,
  carbs: 0, fat: 0, prepTime: 15, ingredients: [], steps: [], dietTags: [],
};

const MEAL_BADGE: Record<string, string> = { breakfast: 'Petit déj.', lunch: 'Déjeuner', dinner: 'Dîner' };

export default function MyRecipes() {
  const navigate = useNavigate();
  const { customRecipes, createRecipe, updateRecipe, deleteRecipe, loading: recipesLoading } = useRecipes();
  const { addMeals } = useMealPlan();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Recipe, 'id'>>(EMPTY_RECIPE);
  const [newStep, setNewStep] = useState('');
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const displayedRecipes = customRecipes.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  const startCreate = () => { setEditingId(null); setForm({ ...EMPTY_RECIPE, ingredients: [], steps: [] }); setShowEditor(true); };
  const startEdit = (recipe: Recipe) => { setEditingId(recipe.id); const { id, ...rest } = recipe; setForm({ ...rest }); setShowEditor(true); };

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_INGREDIENT }] }));
  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing) }));
  };
  const removeIngredient = (index: number) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== index) }));

  const addStep = () => { if (!newStep.trim()) return; setForm(f => ({ ...f, steps: [...f.steps, newStep.trim()] })); setNewStep(''); };
  const removeStep = (index: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: '⚠️ Titre requis', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateRecipe(editingId, form);
        toast({ title: '✅ Recette modifiée' });
      } else {
        await createRecipe(form);
        toast({ title: '✅ Recette créée' });
      }
      setShowEditor(false);
    } catch (e: any) {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id);
      toast({ title: '🗑️ Recette supprimée' });
    } catch (e: any) {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Mes recettes</h1>
          <Button size="sm" className="gap-1.5 tap-scale" onClick={startCreate}>
            <Plus className="w-4 h-4" /> Créer
          </Button>
        </div>

        {customRecipes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une recette…"
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {recipesLoading ? (
          <div className="text-center py-16 text-muted-foreground">Chargement…</div>
        ) : customRecipes.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Aucune recette personnelle</p>
            <p className="text-sm mt-1">Crée tes propres recettes pour les ajouter au planning.</p>
            <Button className="mt-4 gap-1.5 tap-scale" onClick={startCreate}>
              <Plus className="w-4 h-4" /> Créer ma première recette
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {customRecipes.map((recipe, i) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="card-elevated p-4 space-y-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-base">{recipe.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {MEAL_BADGE[recipe.mealType] || recipe.mealType}
                      </span>
                    </div>
                    {recipe.description && <p className="text-sm text-body-text mt-0.5">{recipe.description}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-accent" />{recipe.calories} kcal</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{recipe.prepTime} min</span>
                    <span>{recipe.ingredients.length} ingrédients</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1.5 tap-scale" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                      <Eye className="w-4 h-4" /> Voir
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 tap-scale" onClick={() => startEdit(recipe)}>
                      <Edit className="w-4 h-4" /> Modifier
                    </Button>
                    <Button size="sm" className="gap-1.5 tap-scale" onClick={() => setPlanRecipe(recipe)}>
                      <CalendarPlus className="w-4 h-4" /> Au planning
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 tap-scale text-destructive">
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
                          <AlertDialogDescription>« {recipe.title} » sera définitivement supprimée.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(recipe.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Recipe Editor */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Modifier la recette' : 'Nouvelle recette'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="Ex: Salade césar maison" />
            </div>
            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} placeholder="Courte description…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Type de repas</Label>
                <Select value={form.mealType} onValueChange={(v) => setForm(f => ({ ...f, mealType: v as Recipe['mealType'] }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Petit déjeuner</SelectItem>
                    <SelectItem value="lunch">Déjeuner</SelectItem>
                    <SelectItem value="dinner">Dîner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Temps (min)</Label>
                <Input type="number" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div><Label className="text-xs font-medium">Calories</Label><Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
              <div><Label className="text-xs font-medium">Prot. (g)</Label><Input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
              <div><Label className="text-xs font-medium">Gluc. (g)</Label><Input type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
              <div><Label className="text-xs font-medium">Lip. (g)</Label><Input type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
            </div>

            {/* Ingredients */}
            <div>
              <Label className="text-xs font-semibold">Ingrédients</Label>
              <div className="space-y-2 mt-2">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <Input placeholder="Nom" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} className="flex-1" />
                    <Input type="number" placeholder="Qté" value={ing.quantity || ''} onChange={e => updateIngredient(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-16" />
                    <Input placeholder="Unité" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} className="w-16" />
                    <Select value={ing.category} onValueChange={(v) => updateIngredient(i, 'category', v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="protein">Protéine</SelectItem>
                        <SelectItem value="carbs">Féculent</SelectItem>
                        <SelectItem value="vegetables">Légume</SelectItem>
                        <SelectItem value="dairy">Laitier</SelectItem>
                        <SelectItem value="fruits">Fruit</SelectItem>
                        <SelectItem value="condiments">Condiment</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeIngredient(i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {form.ingredients.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucun ingrédient ajouté</p>}
              </div>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs mt-2" onClick={addIngredient}>
                <Plus className="w-3 h-3" /> Ajouter un ingrédient
              </Button>
            </div>

            {/* Steps */}
            <div>
              <Label className="text-xs font-semibold">Étapes</Label>
              <ol className="space-y-1 mt-2">
                {form.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span className="flex-1">{step}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeStep(i)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ol>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Nouvelle étape…" value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()} className="flex-1" />
                <Button variant="outline" size="sm" onClick={addStep}>Ajouter</Button>
              </div>
            </div>

            {/* Primary save action */}
            <Button className="w-full tap-scale font-semibold" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? '✅ Enregistrer les modifications' : '✅ Créer la recette'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {planRecipe && (
        <AddToPlanModal
          open={!!planRecipe}
          onOpenChange={(open) => !open && setPlanRecipe(null)}
          recipe={planRecipe}
          onAdd={(items) => addMeals(items)}
        />
      )}
    </AppLayout>
  );
}
