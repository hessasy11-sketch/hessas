import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { adminSessionManager, initActivityTracking } from '../../utils/adminSessionManager';

interface AdminSessionGuardProps {
  children: React.ReactNode;
}

export function AdminSessionGuard({ children }: AdminSessionGuardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        console.log('🔍 AdminSessionGuard - Checking session...');

        const localSession = adminSessionManager.getSession();

        if (!localSession) {
          console.log('❌ No session found - redirecting to /admin/access');
          if (isMounted) {
            navigate('/admin/access', { replace: true });
          }
          return;
        }

        console.log('✅ Session found in localStorage:', {
          staff_id: localSession.staff_id,
          full_name: localSession.full_name,
          role: localSession.role,
          created_at: new Date(localSession.created_at).toLocaleString(),
          last_activity: new Date(localSession.last_activity_at).toLocaleString(),
          session_token: localSession.session_token ? 'Present' : 'Missing'
        });

        if (localSession.session_token) {
          console.log('🔄 Updating session activity in background...');
          adminSessionManager.updateActivityInDB().catch(err => {
            console.warn('Failed to update activity in DB (non-critical):', err);
          });
        }

        if (isMounted) {
          setIsAuthenticated(true);
          initActivityTracking();
          console.log('✅ Session validated - Allowing access');
        }
      } catch (error) {
        console.error('❌ Error in session check:', error);
        if (isMounted) {
          navigate('/admin/access', { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <Loader2 className="w-20 h-20 text-white animate-spin relative z-10" />
          </div>
          <p className="text-white text-xl font-bold mb-2">جاري التحقق من الجلسة...</p>
          <p className="text-gray-400">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
