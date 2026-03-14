import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Flame, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MealPlanItem, Recipe } from '@/data/types';
import { motion } from 'framer-motion';
import AddToPlanModal from '@/components/AddToPlanModal';

const CATEGORY_LABELS: Record<string, string> = {
  protein: '🥩 Protéines',
  carbs: '🍚 Féculents',
  vegetables: '🥬 Légumes',
  dairy: '🧀 Produits laitiers',
  fruits: '🍎 Fruits',
  condiments: '🧂 Assaisonnements',
  other: '📦 Autres',
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);
  const [showModal, setShowModal] = useState(false);
  const [detailedMode, setDetailedMode] = useState(false);

  const allRecipes = [...mockRecipes, ...customRecipes];
  const recipe = allRecipes.find(r => r.id === id);

  if (!recipe) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Recette introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/meals')}>Retour aux repas</Button>
        </div>
      </AppLayout>
    );
  }

  const grouped = recipe.ingredients.reduce((acc, ing) => {
    const cat = ing.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {} as Record<string, typeof recipe.ingredients>);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Button variant="ghost" className="gap-2 -ml-2 tap-scale" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        <div>
          <h1 className="text-2xl font-display font-bold">{recipe.title}</h1>
          <p className="text-body-text mt-1">{recipe.description}</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full font-medium">
            <Flame className="w-4 h-4" /> {recipe.calories} kcal
          </span>
          <span className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" /> {recipe.prepTime} min
          </span>
        </div>

        <div className="card-elevated p-4">
          <h2 className="font-display font-semibold text-sm mb-3">Macronutriments estimés</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="font-display font-bold text-lg">{recipe.protein}g</p>
              <p className="text-xs text-muted-foreground">Protéines</p>
            </div>
            <div className="bg-accent/5 rounded-lg p-3">
              <p className="font-display font-bold text-lg">{recipe.carbs}g</p>
              <p className="text-xs text-muted-foreground">Glucides</p>
            </div>
            <div className="bg-secondary/5 rounded-lg p-3">
              <p className="font-display font-bold text-lg">{recipe.fat}g</p>
              <p className="text-xs text-muted-foreground">Lipides</p>
            </div>
          </div>
        </div>

        <div className="card-elevated p-4">
          <h2 className="font-display font-semibold text-sm mb-3">Ingrédients</h2>
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs text-muted-foreground font-medium mb-1">{CATEGORY_LABELS[cat] || cat}</p>
                <ul className="space-y-1">
                  {items.map((ing, i) => (
                    <li key={i} className="text-sm flex justify-between">
                      <span>{ing.name}</span>
                      <span className="text-muted-foreground">{ing.quantity} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm">Préparation</h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground h-7"
              onClick={() => setDetailedMode(!detailedMode)}
            >
              {detailedMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {detailedMode ? 'Vue rapide' : 'Vue détaillée'}
            </Button>
          </div>

          {!detailedMode ? (
            /* Simple / quick view */
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-display font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-body-text pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            /* Detailed / beginner-friendly view */
            <div className="space-y-4">
              {recipe.steps.map((step, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-display font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Étape {i + 1} sur {recipe.steps.length}</span>
                  </div>
                  <p className="text-sm text-body-text leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full gap-2 tap-scale" size="lg" onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" /> Ajouter au planning
        </Button>
      </motion.div>

      <AddToPlanModal
        open={showModal}
        onOpenChange={setShowModal}
        recipe={recipe}
        onAdd={(items) => setMealPlan(prev => [...prev, ...items])}
      />
    </AppLayout>
  );
}
