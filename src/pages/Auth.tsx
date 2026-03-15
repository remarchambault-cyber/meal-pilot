import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/', { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Compte créé ! Vérifie ton email pour confirmer.' });
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Erreur', description: 'Entre ton adresse email.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email envoyé', description: 'Si cette adresse existe, tu recevras un lien de réinitialisation.' });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-10">
            <h1 className="text-2xl font-display font-bold text-primary">MealPilot</h1>
            <p className="text-muted-foreground text-sm mt-2">Réinitialise ton mot de passe</p>
          </div>

          <form onSubmit={handleForgotPassword} className="card-elevated p-6 space-y-5">
            <div>
              <Label className="text-xs font-medium" htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" className="w-full tap-scale rounded-xl" size="lg" disabled={loading}>
              {loading ? '...' : 'Envoyer le lien'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setIsForgotPassword(false)}
              >
                Retour à la connexion
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-display font-bold text-primary">MealPilot</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? 'Connecte-toi à ton compte' : 'Crée ton compte'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-5">
          <div>
            <Label className="text-xs font-medium" htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-medium" htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
              minLength={6}
              required
            />
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsForgotPassword(true)}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full tap-scale rounded-xl" size="lg" disabled={loading}>
            {loading ? '...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
