import { MapPin, User, Users, AlertTriangle, TrendingUp, TrendingDown, Lock, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FarmCommandCardProps {
  farm: {
    id: string;
    name: string;
    location: string;
    city: string;
    operational_status: string;
    suspended_at: string | null;
    manager_name: string | null;
    readiness_score: number;
    teams_count: number;
    open_issues: number;
    monthly_net: number;
  };
}

export default function FarmCommandCard({ farm }: FarmCommandCardProps) {
  const navigate = useNavigate();

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      setup: {
        label: 'إعداد',
        icon: Clock,
        color: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200'
      },
      active: {
        label: 'نشطة',
        icon: CheckCircle,
        color: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200'
      },
      suspended: {
        label: 'موقوفة',
        icon: Lock,
        color: 'bg-red-100 text-red-700',
        borderColor: 'border-red-200'
      }
    };
    return configs[status] || configs.setup;
  };

  const statusConfig = getStatusConfig(farm.operational_status);
  const StatusIcon = statusConfig.icon;

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div
      onClick={() => navigate(`/admin/b2f/farm-command/farms/${farm.id}`)}
      className={`bg-white rounded-xl border-2 ${statusConfig.borderColor} p-6 hover:shadow-xl transition-all cursor-pointer group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {farm.name}
            </h3>
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{farm.city}</span>
            {farm.location && <span>• {farm.location}</span>}
          </div>
        </div>

        {/* Readiness Score */}
        <div className="text-center">
          <div className={`text-3xl font-black ${getReadinessColor(farm.readiness_score)}`}>
            {farm.readiness_score}%
          </div>
          <p className="text-xs text-gray-500">الجاهزية</p>
        </div>
      </div>

      {/* Manager */}
      {farm.manager_name && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">المدير: {farm.manager_name}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">{farm.teams_count}</span>
          </div>
          <p className="text-xs text-gray-500">فرق العمل</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className={`w-4 h-4 ${farm.open_issues > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="text-lg font-bold text-gray-900">{farm.open_issues}</span>
          </div>
          <p className="text-xs text-gray-500">أعطال مفتوحة</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {farm.monthly_net >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-bold ${farm.monthly_net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(farm.monthly_net))}
            </span>
          </div>
          <p className="text-xs text-gray-500">صافي الشهر</p>
        </div>
      </div>

      {/* Suspended Info */}
      {farm.operational_status === 'suspended' && farm.suspended_at && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
          <Lock className="w-4 h-4 text-red-600" />
          <span className="text-xs text-red-700">
            موقوفة منذ {new Date(farm.suspended_at).toLocaleDateString('ar-SA')}
          </span>
        </div>
      )}
    </div>
  );
}
