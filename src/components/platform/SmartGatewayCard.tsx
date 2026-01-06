import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { GatewayCard as GatewayCardType } from '../../hooks/useGatewayAccess';

interface Props {
  card: GatewayCardType;
}

export default function SmartGatewayCard({ card }: Props) {
  const navigate = useNavigate();

  const Icon = (Icons as any)[card.icon] || Icons.Box;

  const getGradientClasses = () => {
    if (card.gradient_from && card.gradient_to) {
      return `from-${card.gradient_from} to-${card.gradient_to}`;
    }
    return `from-${card.color}-500 to-${card.color}-600`;
  };

  const getAccessBadge = () => {
    if (card.is_gm_access) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg flex items-center gap-1">
          <Icons.Crown className="w-3 h-3" />
          وصول كامل
        </span>
      );
    }

    switch (card.access_level) {
      case 'full':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg">كامل</span>;
      case 'manage':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">إدارة</span>;
      case 'operate':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg">تشغيل</span>;
      case 'view':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-lg">عرض</span>;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={() => navigate(card.route_path)}
      className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden"
    >
      {/* Background Gradient (on hover) */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradientClasses()} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getGradientClasses()} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>

          {getAccessBadge()}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all">
          {card.title_ar}
        </h3>

        {/* Description */}
        {card.description_ar && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {card.description_ar}
          </p>
        )}

        {/* Arrow Icon */}
        <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Icons.ArrowLeft className={`w-5 h-5 text-${card.color}-600`} />
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </button>
  );
}
