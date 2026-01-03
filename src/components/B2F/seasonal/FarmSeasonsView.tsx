import { useState, useEffect } from 'react';
import { ArrowRight, Plus, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SeasonCard } from './SeasonCard';
import { CreateSeasonModal } from './CreateSeasonModal';
import { SeasonManagementView } from './SeasonManagementView';

interface FarmSeasonsViewProps {
  farmId: string;
  farmName: string;
  onBack: () => void;
}

interface Season {
  id: string;
  season_name: string;
  season_year: number;
  season_type: 'oil' | 'fresh_dates' | 'dried_dates' | 'other';
  status: 'season_created' | 'active' | 'harvest' | 'closed';
  start_date?: string;
  end_date?: string;
  description?: string;
  created_at: string;
}

export function FarmSeasonsView({ farmId, farmName, onBack }: FarmSeasonsViewProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  useEffect(() => {
    loadSeasons();
  }, [farmId]);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('farm_seasons')
        .select('*')
        .eq('farm_id', farmId)
        .order('season_year', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSeasons(data || []);
    } catch (err) {
      console.error('Error loading seasons:', err);
      setError('حدث خطأ أثناء تحميل المواسم');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterSeason = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  // Show season management view if a season is selected
  if (selectedSeasonId) {
    return (
      <SeasonManagementView
        seasonId={selectedSeasonId}
        farmName={farmName}
        onBack={() => setSelectedSeasonId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل المواسم...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSeasons}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 mb-4 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span className="font-medium">العودة للمزارع</span>
        </button>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{farmName}</h1>
              <p className="text-gray-600">إدارة مواسم التشغيل</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>إنشاء موسم جديد</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {seasons.length > 0 && (
        <div className="bg-gradient-to-l from-green-50 to-white rounded-xl border border-green-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">إجمالي المواسم</p>
              <p className="text-3xl font-bold text-green-700">{seasons.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">المواسم النشطة</p>
              <p className="text-3xl font-bold text-blue-700">
                {seasons.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">موسم الحصاد</p>
              <p className="text-3xl font-bold text-orange-600">
                {seasons.filter(s => s.status === 'harvest').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">المواسم المغلقة</p>
              <p className="text-3xl font-bold text-gray-600">
                {seasons.filter(s => s.status === 'closed').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seasons List */}
      {seasons.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center max-w-md">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مواسم</h3>
            <p className="text-gray-600 mb-6">
              لم يتم إنشاء أي مواسم لهذه المزرعة بعد
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء أول موسم</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasons.map((season) => (
            <SeasonCard
              key={season.id}
              seasonId={season.id}
              seasonName={season.season_name}
              seasonYear={season.season_year}
              seasonType={season.season_type}
              status={season.status}
              startDate={season.start_date}
              endDate={season.end_date}
              onEnterSeason={() => handleEnterSeason(season.id)}
            />
          ))}
        </div>
      )}

      {/* Create Season Modal */}
      {showCreateModal && (
        <CreateSeasonModal
          farmId={farmId}
          farmName={farmName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadSeasons}
        />
      )}
    </div>
  );
}
