import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const [auth] = useLocalStorage('mealpilot_auth', false);

  useEffect(() => {
    if (auth) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [auth, navigate]);

  return null;
};

export default Index;
