import { MapPin, Users, Calendar, Activity, ChevronLeft } from 'lucide-react';

interface FarmOperationCardProps {
  farmId: string;
  farmName: string;
  treeType: string;
  location: string;
  investorsCount: number;
  activeSeasonsCount: number;
  operationStatus: 'no_season' | 'active' | 'completed';
  onManageClick: () => void;
}

export function FarmOperationCard({
  farmName,
  treeType,
  location,
  investorsCount,
  activeSeasonsCount,
  operationStatus,
  onManageClick
}: FarmOperationCardProps) {
  const getTreeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'olive': 'زيتون',
      'palm': 'نخيل',
      'other': 'أخرى'
    };
    return types[type] || type;
  };

  const getStatusInfo = () => {
    switch (operationStatus) {
      case 'active':
        return {
          label: 'موسم نشط',
          color: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'completed':
        return {
          label: 'موسم منتهٍ',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      default:
        return {
          label: 'لا يوجد موسم',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-green-50 to-white p-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex-1">
            {farmName}
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tree Type */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="font-medium">نوع الأشجار:</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 mr-6">
            {getTreeTypeLabel(treeType)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Investors Count */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-800 font-medium">المستثمرين</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{investorsCount}</p>
          </div>

          {/* Active Seasons */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-800 font-medium">المواسم النشطة</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{activeSeasonsCount}</p>
          </div>
        </div>

        {/* Manage Button */}
        <button
          onClick={onManageClick}
          className="w-full bg-gradient-to-l from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <span>إدارة التشغيل</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
