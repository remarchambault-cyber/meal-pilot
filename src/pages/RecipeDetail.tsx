import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useProfile } from '@/hooks/useProfile';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateCalorieTarget, getMealCalorieSuggestion } from '@/lib/calories';
import { scaleRecipe, getScaleFactorForMealType } from '@/lib/recipeScaling';
import { motion } from 'framer-motion';
import AddToPlanModal from '@/components/AddToPlanModal';

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protéines',
  carbs: 'Féculents',
  vegetables: 'Légumes',
  dairy: 'Produits laitiers',
  fruits: 'Fruits',
  condiments: 'Assaisonnements',
  other: 'Autres',
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { allRecipes, loading: recipesLoading } = useRecipes();
  const { addMeals } = useMealPlan();
  const { profile } = useProfile();
  const [showModal, setShowModal] = useState(false);
  const [detailedMode, setDetailedMode] = useState(false);

  const recipe = allRecipes.find(r => r.id === id);

  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);
  const mealTargets = useMemo(() => target ? getMealCalorieSuggestion(target.target) : null, [target]);

  const scaleFactor = useMemo(() => {
    const paramScale = parseFloat(searchParams.get('scale') || '');
    if (paramScale && paramScale > 0) return paramScale;
    if (!recipe) return 1;
    return getScaleFactorForMealType(recipe, mealTargets);
  }, [searchParams, recipe, mealTargets]);

  if (recipesLoading) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground text-sm">Chargement…</div>
      </AppLayout>
    );
  }

  if (!recipe) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-body-text">Recette introuvable</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate('/meals')}>Retour aux repas</Button>
        </div>
      </AppLayout>
    );
  }

  const scaled = scaleRecipe(recipe, scaleFactor);

  const grouped = scaled.ingredients.reduce((acc, ing) => {
    const cat = ing.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {} as Record<string, typeof scaled.ingredients>);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <Button variant="ghost" className="gap-2 -ml-3 tap-scale text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold leading-tight">{recipe.title}</h1>
          <p className="text-body-text mt-2 leading-relaxed">{recipe.description}</p>
        </div>

        {/* Meta badges */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 bg-primary/8 text-primary px-3.5 py-1.5 rounded-full font-semibold text-[13px]">
            {scaled.calories} kcal
          </span>
          <span className="flex items-center gap-1.5 bg-muted px-3.5 py-1.5 rounded-full text-muted-foreground text-[13px]">
            <Clock className="w-3.5 h-3.5" /> {recipe.prepTime} min
          </span>
          {scaled.isScaled && (
            <span className="flex items-center gap-1.5 bg-accent px-3.5 py-1.5 rounded-full text-accent-foreground text-[11px] font-medium">
              Portion ajustée
            </span>
          )}
        </div>

        {scaled.isScaled && (
          <div className="text-[12px] text-muted-foreground bg-muted/50 rounded-xl p-4 leading-relaxed">
            Quantités ajustées pour votre cible ({scaled.calories} kcal au lieu de {recipe.calories} kcal).
          </div>
        )}

        {/* Macros */}
        <div className="card-elevated p-5">
          <p className="section-title mb-4">Macronutriments</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 rounded-xl bg-muted/40">
              <p className="font-display font-bold text-xl">{scaled.protein}g</p>
              <p className="text-[11px] text-muted-foreground mt-1">Protéines</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/40">
              <p className="font-display font-bold text-xl">{scaled.carbs}g</p>
              <p className="text-[11px] text-muted-foreground mt-1">Glucides</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/40">
              <p className="font-display font-bold text-xl">{scaled.fat}g</p>
              <p className="text-[11px] text-muted-foreground mt-1">Lipides</p>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="card-elevated p-5">
          <p className="section-title mb-4">Ingrédients</p>
          <div className="space-y-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-foreground mb-2">{CATEGORY_LABELS[cat] || cat}</p>
                <ul className="space-y-1.5">
                  {items.map((ing, i) => (
                    <li key={i} className="text-sm flex justify-between py-1 border-b border-border/30 last:border-0">
                      <span className="text-body-text">{ing.name}</span>
                      <span className="text-muted-foreground font-medium">{ing.scaledQuantity} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Préparation</p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground h-7 rounded-lg"
              onClick={() => setDetailedMode(!detailedMode)}
            >
              {detailedMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {detailedMode ? 'Vue rapide' : 'Vue détaillée'}
            </Button>
          </div>

          {!detailedMode ? (
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/8 text-primary font-display font-bold text-xs flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-body-text leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="space-y-3">
              {recipe.steps.map((step, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-display font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">Étape {i + 1} sur {recipe.steps.length}</span>
                  </div>
                  <p className="text-sm text-body-text leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full gap-2 tap-scale rounded-xl" size="lg" onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" /> Ajouter au planning
        </Button>
      </motion.div>

      <AddToPlanModal
        open={showModal}
        onOpenChange={setShowModal}
        recipe={recipe}
        mealTargets={mealTargets}
        onAdd={(items) => addMeals(items)}
      />
    </AppLayout>
  );
}
