import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Recipe, RecipeIngredient } from '@/data/types';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Eye, Flame, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const EMPTY_INGREDIENT: RecipeIngredient = { name: '', quantity: 0, unit: 'g', category: 'other' };

const EMPTY_RECIPE: Omit<Recipe, 'id'> = {
  title: '',
  description: '',
  mealType: 'lunch',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  prepTime: 15,
  ingredients: [],
  steps: [],
  dietTags: [],
};

export default function MyRecipes() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Recipe, 'id'>>(EMPTY_RECIPE);
  const [newStep, setNewStep] = useState('');

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_RECIPE, ingredients: [], steps: [] });
    setShowEditor(true);
  };

  const startEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    const { id, ...rest } = recipe;
    setForm({ ...rest });
    setShowEditor(true);
  };

  const addIngredient = () => {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_INGREDIENT }] }));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing),
    }));
  };

  const removeIngredient = (index: number) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== index) }));
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setForm(f => ({ ...f, steps: [...f.steps, newStep.trim()] }));
    setNewStep('');
  };

  const removeStep = (index: number) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: '⚠️ Titre requis', variant: 'destructive' });
      return;
    }
    if (editingId) {
      setRecipes(prev => prev.map(r => r.id === editingId ? { ...form, id: editingId } : r));
      toast({ title: '✅ Recette modifiée' });
    } else {
      const newRecipe: Recipe = { ...form, id: `custom_${Date.now()}` };
      setRecipes(prev => [...prev, newRecipe]);
      toast({ title: '✅ Recette créée' });
    }
    setShowEditor(false);
  };

  const handleDelete = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    toast({ title: '🗑️ Recette supprimée' });
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

        {recipes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Aucune recette personnelle</p>
            <p className="text-sm mt-1">Crée tes propres recettes pour les ajouter au planning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe, i) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-elevated p-4 space-y-3"
              >
                <div>
                  <h3 className="font-display font-semibold text-base">{recipe.title}</h3>
                  {recipe.description && <p className="text-sm text-body-text mt-0.5">{recipe.description}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-accent" />{recipe.calories} kcal</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{recipe.prepTime} min</span>
                  <span>{recipe.ingredients.length} ingrédients</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 tap-scale" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                    <Eye className="w-4 h-4" /> Voir
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 tap-scale" onClick={() => startEdit(recipe)}>
                    <Edit className="w-4 h-4" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 tap-scale text-destructive" onClick={() => handleDelete(recipe.id)}>
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Modifier la recette' : 'Nouvelle recette'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type de repas</Label>
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
                <Label className="text-xs">Temps (min)</Label>
                <Input type="number" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Calories</Label>
                <Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Prot. (g)</Label>
                <Input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Gluc. (g)</Label>
                <Input type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Lip. (g)</Label>
                <Input type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Ingrédients</Label>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={addIngredient}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
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
              </div>
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

            <Button className="w-full tap-scale" onClick={handleSave}>
              {editingId ? 'Enregistrer les modifications' : 'Créer la recette'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
