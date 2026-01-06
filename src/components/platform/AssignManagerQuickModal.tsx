import { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFarmCommand } from '../../hooks/useFarmCommand';

interface AssignManagerQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Farm {
  id: string;
  name: string;
  location: string;
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

export default function AssignManagerQuickModal({ onClose, onSuccess }: AssignManagerQuickModalProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { assignManager } = useFarmCommand();

  const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    loadFarms();
    loadStaff();
  }, []);

  const loadFarms = async () => {
    const { data } = await supabase
      .from('b2f_farms')
      .select('id, name, location')
      .eq('operational_status', 'active')
      .order('name');

    if (data) setFarms(data);
  };

  const loadStaff = async () => {
    const { data } = await supabase
      .from('platform_staff')
      .select('id, full_name, role')
      .order('full_name');

    if (data) setStaff(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFarm || !selectedManager) {
      setError('يرجى اختيار المزرعة والمدير');
      return;
    }

    setLoading(true);
    setError('');

    const result = await assignManager(
      selectedFarm,
      selectedManager,
      CURRENT_USER_ID,
      reason || undefined
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } else {
      setError(result.error || 'فشل تعيين المدير');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">تعيين مدير مزرعة</h2>
              <p className="text-sm text-emerald-100">Assign Farm Manager</p>
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
              <p className="text-lg font-bold text-emerald-900">تم التعيين بنجاح</p>
              <p className="text-sm text-emerald-600 mt-1">سيتم تحديث البيانات...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اختر المزرعة
                </label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
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
                  اختر المدير
                </label>
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المدير --</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  السبب (اختياري)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: تغيير المدير بسبب..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none resize-none"
                />
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
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري التعيين...' : 'تعيين المدير'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
