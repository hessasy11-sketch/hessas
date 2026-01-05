import { Lock, AlertTriangle } from 'lucide-react';

interface OperationLockGuardProps {
  isLocked: boolean;
  status: 'setup' | 'active' | 'suspended';
  suspendedReason?: string;
  suspendedAt?: string;
  children: React.ReactNode;
  mode?: 'create' | 'modify' | 'view';
}

export default function OperationLockGuard({
  isLocked,
  status,
  suspendedReason,
  suspendedAt,
  children,
  mode = 'modify'
}: OperationLockGuardProps) {
  if (!isLocked || mode === 'view') {
    return <>{children}</>;
  }

  const suspendedDate = suspendedAt ? new Date(suspendedAt).toLocaleDateString('ar-SA') : '';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
      <div className="text-center max-w-md mx-auto">
        <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-red-600" />
        </div>

        <h3 className="text-2xl font-bold text-red-900 mb-2">
          المزرعة موقوفة مؤقتاً
        </h3>

        <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
            <div className="text-right">
              <p className="text-red-800 font-medium mb-1">
                العمليات التالية معطلة مؤقتاً:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• إنشاء وتعديل المهام</li>
                <li>• إضافة معدات جديدة</li>
                <li>• تسجيل المصروفات والإيرادات</li>
                <li>• إنشاء بلاغات فنية جديدة</li>
              </ul>
            </div>
          </div>
        </div>

        {suspendedReason && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-right">
            <p className="text-sm text-gray-600 mb-1">السبب:</p>
            <p className="text-gray-900 font-medium">{suspendedReason}</p>
          </div>
        )}

        {suspendedDate && (
          <p className="text-sm text-gray-600 mb-6">
            تاريخ التوقيف: {suspendedDate}
          </p>
        )}

        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-700 mb-3">
            يمكنك <span className="font-bold text-gray-900">عرض البيانات فقط</span> حتى يتم رفع التوقيف
          </p>
          <p className="text-sm text-gray-500">
            للاستفسار، تواصل مع القيادة الوطنية للمزارع
          </p>
        </div>
      </div>
    </div>
  );
}
