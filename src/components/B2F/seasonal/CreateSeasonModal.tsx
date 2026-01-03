import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CreateSeasonModalProps {
  farmId: string;
  farmName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSeasonModal({ farmId, farmName, onClose, onSuccess }: CreateSeasonModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    seasonName: `موسم ${currentYear}`,
    seasonYear: currentYear,
    seasonType: 'oil' as 'oil' | 'fresh_dates' | 'dried_dates' | 'other',
    startDate: '',
    endDate: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('farm_seasons')
        .insert({
          farm_id: farmId,
          season_name: formData.seasonName,
          season_year: formData.seasonYear,
          season_type: formData.seasonType,
          status: 'season_created',
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          description: formData.description || null
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating season:', err);
      setError('حدث خطأ أثناء إنشاء الموسم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-l from-green-600 to-green-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">إنشاء موسم جديد</h2>
              <p className="text-green-100">{farmName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Season Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              اسم الموسم *
            </label>
            <input
              type="text"
              value={formData.seasonName}
              onChange={(e) => setFormData({ ...formData, seasonName: e.target.value })}
              required
              placeholder="مثال: موسم 2025"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-right"
            />
          </div>

          {/* Season Year */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              سنة الموسم *
            </label>
            <input
              type="number"
              value={formData.seasonYear}
              onChange={(e) => setFormData({ ...formData, seasonYear: parseInt(e.target.value) })}
              required
              min="2020"
              max="2100"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-right"
            />
          </div>

          {/* Season Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              نوع الموسم *
            </label>
            <select
              value={formData.seasonType}
              onChange={(e) => setFormData({ ...formData, seasonType: e.target.value as any })}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-right bg-white"
            >
              <option value="oil">زيت</option>
              <option value="fresh_dates">رطب</option>
              <option value="dried_dates">تمر</option>
              <option value="other">إنتاج آخر</option>
            </select>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تاريخ البدء
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              وصف الموسم (اختياري)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="أضف ملاحظات أو وصف للموسم..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none text-right"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-center font-medium">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>إنشاء الموسم</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
