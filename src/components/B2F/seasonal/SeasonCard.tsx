import { Calendar, Activity, ChevronLeft, Leaf } from 'lucide-react';

interface SeasonCardProps {
  seasonId: string;
  seasonName: string;
  seasonYear: number;
  seasonType: 'oil' | 'fresh_dates' | 'dried_dates' | 'other';
  status: 'season_created' | 'active' | 'harvest' | 'closed';
  startDate?: string;
  endDate?: string;
  onEnterSeason: () => void;
}

export function SeasonCard({
  seasonName,
  seasonYear,
  seasonType,
  status,
  startDate,
  endDate,
  onEnterSeason
}: SeasonCardProps) {
  const getSeasonTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'oil': 'زيت',
      'fresh_dates': 'رطب',
      'dried_dates': 'تمر',
      'other': 'إنتاج آخر'
    };
    return types[type] || type;
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'active':
        return {
          label: 'جارٍ',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🟢'
        };
      case 'harvest':
        return {
          label: 'موسم الحصاد',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '🌾'
        };
      case 'closed':
        return {
          label: 'مغلق',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '🔒'
        };
      default:
        return {
          label: 'تم إنشاؤه',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '📋'
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--/--/----';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-green-50 to-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">
              {seasonName}
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color} flex items-center gap-1`}>
            <span>{statusInfo.icon}</span>
            <span>{statusInfo.label}</span>
          </span>
        </div>

        {/* Year Badge */}
        <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-semibold">
          <span>السنة:</span>
          <span>{seasonYear}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Season Type */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600 font-medium">نوع الموسم:</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 mr-6">
            {getSeasonTypeLabel(seasonType)}
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-800 font-medium mb-1">تاريخ البدء</p>
            <p className="text-sm font-bold text-blue-900 dir-ltr text-right">
              {formatDate(startDate)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <p className="text-xs text-purple-800 font-medium mb-1">تاريخ الانتهاء</p>
            <p className="text-sm font-bold text-purple-900 dir-ltr text-right">
              {formatDate(endDate)}
            </p>
          </div>
        </div>

        {/* Enter Button */}
        <button
          onClick={onEnterSeason}
          className="w-full bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <Activity className="w-5 h-5" />
          <span>دخول موسم التشغيل</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
