import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageGuard } from './PermissionGuard';
import { SessionTracker } from './SessionTracker';
import { adminSessionManager } from '../../utils/adminSessionManager';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      let session = adminSessionManager.getSession();

      // If no session exists, create a default GM session for direct access
      if (!session) {
        console.log('📋 No active session found, creating default session for direct access...');
        const success = await adminSessionManager.createSession({
          staff_id: 'gm-001',
          user_id: 'gm-001',
          full_name: 'المدير العام',
          role: 'super_admin',
          role_title: 'المدير العام',
          department: 'executive',
          is_super_admin: true,
          is_platform_owner: true,
        });

        if (success) {
          session = adminSessionManager.getSession();
          console.log('✅ Default session created successfully');
        } else {
          console.error('❌ Failed to create default session');
        }
      }

      setPlatformRole(session?.role || null);
      setLoading(false);
    };

    initSession();
  }, []);

  const handleClose = () => {
    navigate('/admin', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تهيئة الجلسة...</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard platformRole={platformRole} pageKey="b2f">
      <SessionTracker />
      <B2FControlPanel onClose={handleClose} />
    </PageGuard>
  );
}
