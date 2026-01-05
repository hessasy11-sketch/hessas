import { useNavigate } from 'react-router-dom';
import { SessionTracker } from './SessionTracker';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    // Return to main admin page
    navigate('/admin', { replace: true });
  };

  return (
    <>
      <SessionTracker />
      <B2FControlPanel onClose={handleClose} />
    </>
  );
}
