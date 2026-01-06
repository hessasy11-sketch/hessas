import { useImpersonation } from '../../contexts/ImpersonationContext';
import { Eye, X, User, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ViewAsBanner() {
  const { impersonation, stopImpersonation, isGM } = useImpersonation();
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (!impersonation.isActive || !impersonation.startedAt) return;

    const updateDuration = () => {
      const start = new Date(impersonation.startedAt!);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [impersonation.isActive, impersonation.startedAt]);

  if (!isGM || !impersonation.isActive) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-2xl border-b-4 border-amber-600">
      <div className="max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center animate-pulse">
              <Eye className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold uppercase tracking-wide">وضع المراقبة النشط</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-lg text-xs font-bold">View-As Mode</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span className="font-medium">تعرض كـ:</span>
                  <span className="font-bold">{impersonation.targetStaffName}</span>
                </div>
                {impersonation.targetRole && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-lg text-xs font-medium">
                    {impersonation.targetRole}
                  </span>
                )}
                {impersonation.targetDepartment && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-lg text-xs font-medium">
                    {impersonation.targetDepartment}
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-amber-100">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-medium">{duration}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={stopImpersonation}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all shadow-lg hover:shadow-xl"
          >
            <X className="w-4 h-4" />
            <span>إيقاف المراقبة</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-pulse"></div>
    </div>
  );
}
