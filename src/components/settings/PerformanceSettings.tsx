import { Zap, TrendingUp } from 'lucide-react';

export function PerformanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">إعدادات الأداء</h3>
        <p className="text-gray-600">تحسين سرعة وأداء المنصة</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-2">جيد</div>
            <div className="text-green-50">حالة الأداء</div>
          </div>
          <TrendingUp className="w-16 h-16 opacity-50" />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          نظام الأداء
        </h4>
        <p className="text-gray-600 text-sm">
          يتم مراقبة الأداء تلقائياً وتطبيق التحسينات المناسبة
        </p>
      </div>
    </div>
  );
}
