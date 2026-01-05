import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionTracker } from './SessionTracker';
import { adminSessionManager } from '../../utils/adminSessionManager';
import B2FControlPanel from '../B2F/B2FControlPanel';

export function B2FAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = () => {
      let session = adminSessionManager.getSession();

      // If no session exists, create a lightweight localStorage-only session for quick access
      if (!session) {
        console.log('📋 No active session found, creating quick access session (localStorage only)...');

        try {
          // Use setSession instead of createSession to avoid DB call and UUID validation
          adminSessionManager.setSession({
            staff_id: 'quick-access-gm',
            user_id: 'quick-access-gm',
            full_name: 'المدير العام - وصول سريع',
            role: 'super_admin',
            role_title: 'المدير العام',
            department: 'executive',
            is_super_admin: true,
            is_platform_owner: true,
          });

          session = adminSessionManager.getSession();
          console.log('✅ Quick access session created successfully');
          console.log('   - This is a localStorage-only session');
          console.log('   - No database interaction required');
          console.log('   - Full B2F access enabled');
        } catch (error) {
          console.error('❌ Failed to create quick access session:', error);
        }
      } else {
        console.log('✅ Existing session found:', session.full_name);
      }

      setLoading(false);
    };

    initSession();
  }, []);

  const handleClose = () => {
    navigate('/hq', { replace: true });
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
    <>
      <SessionTracker />
      <B2FControlPanel onClose={handleClose} />
    </>
  );
}
