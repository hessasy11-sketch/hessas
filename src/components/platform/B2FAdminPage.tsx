import { useNavigate } from 'react-router-dom';
import { PageGuard } from './PermissionGuard';
import { SessionTracker } from './SessionTracker';
import { adminSessionManager } from '../../utils/adminSessionManager';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();
  const session = adminSessionManager.getSession();
  const platformRole = session?.role || null;

  const handleClose = () => {
    // Clear session and return to login
    adminSessionManager.destroySession();
    navigate('/admin/access', { replace: true });
  };

  return (
    <PageGuard platformRole={platformRole} pageKey="b2f">
      <SessionTracker />
      <B2FControlPanel onClose={handleClose} />
    </PageGuard>
  );
}
