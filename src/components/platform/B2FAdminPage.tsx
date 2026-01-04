import { useNavigate } from 'react-router-dom';
import { PageGuard } from './PermissionGuard';
import { adminSessionManager } from '../../utils/adminSessionManager';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();
  const session = adminSessionManager.getSession();
  const platformRole = session?.role || null;

  const handleClose = () => {
    if (platformRole === 'super_admin' || platformRole === 'general_manager') {
      navigate('/hq', { replace: true });
    } else {
      navigate('/admin/b2f', { replace: true });
    }
  };

  return (
    <PageGuard platformRole={platformRole} pageKey="b2f">
      <B2FControlPanel onClose={handleClose} />
    </PageGuard>
  );
}
