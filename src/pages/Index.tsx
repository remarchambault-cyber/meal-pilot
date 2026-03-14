import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEffect } from 'react';
import { UserProfile } from '@/data/types';

const Index = () => {
  const navigate = useNavigate();
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);

  useEffect(() => {
    if (profile) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [profile, navigate]);

  return null;
};

export default Index;
