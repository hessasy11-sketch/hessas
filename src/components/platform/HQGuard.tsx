import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tempSessionManager } from '../../utils/tempSessionManager';

interface HQGuardProps {
  children: ReactNode;
}

export default function HQGuard({ children }: HQGuardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!tempSessionManager.hasValidSession()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (!tempSessionManager.hasValidSession()) {
    return null;
  }

  return <>{children}</>;
}
