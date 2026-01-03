import { useNavigate } from 'react-router-dom';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();

  return (
    <B2FControlPanel
      onClose={() => navigate('/hq', { replace: true })}
    />
  );
}
