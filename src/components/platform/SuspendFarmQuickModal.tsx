import { useState, useEffect } from 'react';
import { X, Ban, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFarmCommand } from '../../hooks/useFarmCommand';

interface SuspendFarmQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Farm {
  id: string;
  name: string;
  location: string;
  operational_status: string;
}

export default function SuspendFarmQuickModal({ onClose, onSuccess }: SuspendFarmQuickModalProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { suspendFarm } = useFarmCommand();

  const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    const { data } = await supabase
      .from('b2f_farms')
      .select('id, name, location, operational_status')
      .eq('operational_status', 'active')
      .order('name');

    if (data) setFarms(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFarm || !reason.trim()) {
      setError('يرجى اختيار المزرعة وكتابة سبب التعليق');
      return;
    }

    setLoading(true);
    setError('');

    const result = await suspendFarm(
      selectedFarm,
      CURRENT_USER_ID,
      reason
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } else {
      setError(result.error || 'فشل تعليق المزرعة');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">تعليق مزرعة مؤقتاً</h2>
              <p className="text-sm text-red-100">Suspend Farm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-emerald-900">تم تعليق المزرعة بنجاح</p>
              <p className="text-sm text-emerald-600 mt-1">تم تسجيل القرار في Executive Log</p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">
                  تحذير: سيتم إيقاف المزرعة عن التشغيل وإغلاق الحجوزات تلقائياً. هذا القرار حساس ويتطلب سبب واضح.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اختر المزرعة
                </label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المزرعة --</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  سبب التعليق <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: مشاكل في الري، نقص في الكوادر، صيانة طارئة..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none resize-none"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  سيتم تسجيل هذا السبب في Executive Log
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 text-sm">خطأ</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري التعليق...' : 'تعليق المزرعة'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
