import { Calendar, TreePine, Users, Activity } from 'lucide-react';

interface SeasonHeaderProps {
  farmName: string;
  seasonName: string;
  seasonYear: number;
  seasonType: string;
  treesCount: number;
  investorsCount: number;
  currentPhase: string;
  progress: number;
}

export function SeasonHeader({
  farmName,
  seasonName,
  seasonYear,
  seasonType,
  treesCount,
  investorsCount,
  currentPhase,
  progress
}: SeasonHeaderProps) {
  const getPhaseLabel = (phase: string) => {
    const phases: Record<string, string> = {
      'activation': 'تفعيل التشغيل',
      'growth': 'مرحلة النمو',
      'irrigation': 'مرحلة الري المبرمج',
      'care': 'العناية الزراعية',
      'production': 'مرحلة الإنتاج',
      'pre_harvest': 'ما قبل الحصاد',
      'harvest': 'جني الثمار',
      'accounting': 'حسم الكميات والمصاريف',
      'processing': 'العصر والتغليف',
      'delivery': 'تسليم المنتج'
    };
    return phases[phase] || phase;
  };

  const getSeasonTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'oil': 'زيت',
      'fresh_dates': 'رطب',
      'dried_dates': 'تمر',
      'other': 'إنتاج آخر'
    };
    return types[type] || type;
  };

  return (
    <div className="bg-gradient-to-l from-green-50 to-white rounded-2xl border-2 border-green-200 p-6 mb-6">
      {/* Farm and Season Info */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{farmName}</h1>
            <p className="text-gray-600">{seasonName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-bold text-lg">
            {seasonYear}
          </span>
          <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold">
            {getSeasonTypeLabel(seasonType)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Trees Count */}
        <div className="bg-white rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <TreePine className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600 font-medium">عدد الأشجار</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{treesCount.toLocaleString()}</p>
        </div>

        {/* Investors Count */}
        <div className="bg-white rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600 font-medium">عدد المستثمرين</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{investorsCount.toLocaleString()}</p>
        </div>

        {/* Current Phase */}
        <div className="bg-white rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600 font-medium">المرحلة الحالية</span>
          </div>
          <p className="text-lg font-bold text-orange-700">{getPhaseLabel(currentPhase)}</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 border border-teal-200">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-600 font-medium">نسبة الإنجاز</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-teal-700">{progress}%</p>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
