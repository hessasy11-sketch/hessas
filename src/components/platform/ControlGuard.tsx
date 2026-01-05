import { ReactNode } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { useAbsoluteControl } from '../../hooks/useAbsoluteControl';

interface ControlGuardProps {
  children: ReactNode;
  showMessage?: boolean;
  customMessage?: string;
}

export default function ControlGuard({ children, showMessage = true, customMessage }: ControlGuardProps) {
  const { session } = useAbsoluteControl();

  if (session.isActive) {
    return <>{children}</>;
  }

  if (!showMessage) {
    return null;
  }

  return (
    <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-6">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-300 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-500" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            {customMessage || 'أمر محمي'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            هذا الأمر متاح فقط في وضع السيطرة المطلقة.
            يرجى تفعيل الوضع من قائمة العمليات.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-200 px-4 py-2 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <span>Protected Command - Requires Absolute Control Mode</span>
        </div>
      </div>
    </div>
  );
}
