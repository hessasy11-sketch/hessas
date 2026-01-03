import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { adminSessionManager, initActivityTracking } from '../../utils/adminSessionManager';

export function SessionTracker() {
  const navigate = useNavigate();
  const [remainingMinutes, setRemainingMinutes] = useState(30);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    initActivityTracking();

    const checkInterval = setInterval(() => {
      const minutes = adminSessionManager.getRemainingMinutes();
      setRemainingMinutes(minutes);

      if (minutes <= 0) {
        adminSessionManager.destroySession();
        navigate('/admin/access', { replace: true });
      } else if (minutes <= 5) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [navigate]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-2xl p-4 border border-orange-400/30 backdrop-blur-sm animate-pulse">
        <div className="flex items-start gap-3" dir="rtl">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm mb-1">
              تحذير: الجلسة ستنتهي قريباً
            </h3>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/80" />
              <p className="text-white/90 text-xs">
                {remainingMinutes} دقيقة متبقية
              </p>
            </div>
            <p className="text-white/80 text-xs mt-2">
              قم بأي نشاط لتجديد الجلسة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
