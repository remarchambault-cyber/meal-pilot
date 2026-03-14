import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      navigate('/auth', { replace: true });
    } else if (isOnboarded) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [user, authLoading, profileLoading, isOnboarded, navigate]);

  return null;
};

export default Index;
