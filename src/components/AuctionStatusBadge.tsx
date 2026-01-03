import { useEffect, useState } from 'react';
import { Clock, Zap, Activity } from 'lucide-react';
import { getAuctionStatus, AuctionStatusInfo } from '../utils/auctionStatus';

interface AuctionStatusBadgeProps {
  startsAt: string;
  endsAt: string;
  dbStatus: string;
  isExtended?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
  showTime?: boolean;
  enableRealtime?: boolean;
}

export function AuctionStatusBadge({
  startsAt,
  endsAt,
  dbStatus,
  isExtended = false,
  variant = 'full',
  showTime = true,
  enableRealtime = true
}: AuctionStatusBadgeProps) {
  const [statusInfo, setStatusInfo] = useState<AuctionStatusInfo>(
    getAuctionStatus(startsAt, endsAt, dbStatus, isExtended)
  );

  useEffect(() => {
    if (!enableRealtime) return;

    const updateStatus = () => {
      const newStatus = getAuctionStatus(startsAt, endsAt, dbStatus, isExtended);
      setStatusInfo(newStatus);
    };

    // تحديث فوري
    updateStatus();

    // تحديث كل دقيقة
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, [startsAt, endsAt, dbStatus, isExtended, enableRealtime]);

  // تصميم خاص للمزادات المباعة
  if (statusInfo.status === 'sold') {
    if (variant === 'minimal') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg border-2 border-yellow-300">
          <span className="text-sm font-bold text-white drop-shadow-md">✓</span>
          <span className="text-xs font-bold text-white drop-shadow-md">
            {statusInfo.label}
          </span>
        </div>
      );
    }

    if (variant === 'compact') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 shadow-xl border-2 border-yellow-300 ring-2 ring-yellow-200/50">
          <div className="flex items-center justify-center w-6 h-6 bg-white/30 backdrop-blur-sm rounded-full">
            <span className="text-base font-bold text-white drop-shadow-md">✓</span>
          </div>
          <span className="text-sm font-bold text-white drop-shadow-md leading-tight">
            {statusInfo.label}
          </span>
        </div>
      );
    }

    // Full variant للمباع
    return (
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 shadow-2xl border-2 border-yellow-300 ring-2 ring-yellow-200/50">
        <div className="flex items-center justify-center w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full">
          <span className="text-2xl font-bold text-white drop-shadow-md">✓</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-white drop-shadow-md leading-tight">
            {statusInfo.label}
          </span>
          <span className="text-xs text-white/90 drop-shadow-sm leading-tight">
            تمت العملية بنجاح
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
        <span className="text-xs">{statusInfo.icon}</span>
        <span className={`text-xs font-bold ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 ${statusInfo.shouldAnimate ? 'animate-pulse' : ''}`}>
        <span className="text-base">{statusInfo.icon}</span>
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${statusInfo.color} leading-tight`}>
            {statusInfo.label}
          </span>
          {showTime && statusInfo.timeText && (
            <span className={`text-[10px] ${statusInfo.color} opacity-80 leading-tight`}>
              {statusInfo.timeText}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 shadow-sm ${statusInfo.shouldAnimate ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-white/50 rounded-lg">
        <span className="text-xl">{statusInfo.icon}</span>
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${statusInfo.color} leading-tight`}>
          {statusInfo.label}
        </span>
        {showTime && statusInfo.timeText && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className={`w-3 h-3 ${statusInfo.color} opacity-70`} />
            <span className={`text-xs ${statusInfo.color} opacity-80 leading-tight`}>
              {statusInfo.timeText}
            </span>
          </div>
        )}
      </div>
      {statusInfo.shouldAnimate && (
        <div className="flex items-center gap-1">
          <Activity className={`w-4 h-4 ${statusInfo.color} animate-pulse`} />
        </div>
      )}
    </div>
  );
}

// مكون خاص لشارة الحالة في الركن العلوي
export function AuctionStatusCornerBadge({
  startsAt,
  endsAt,
  dbStatus,
  isExtended = false,
  enableRealtime = true
}: Omit<AuctionStatusBadgeProps, 'variant' | 'showTime'>) {
  const [statusInfo, setStatusInfo] = useState<AuctionStatusInfo>(
    getAuctionStatus(startsAt, endsAt, dbStatus, isExtended)
  );

  useEffect(() => {
    if (!enableRealtime) return;

    const updateStatus = () => {
      const newStatus = getAuctionStatus(startsAt, endsAt, dbStatus, isExtended);
      setStatusInfo(newStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [startsAt, endsAt, dbStatus, isExtended, enableRealtime]);

  // لا تعرض شارة ركنية للمزادات النشطة العادية (فقط للحالات المميزة)
  if (statusInfo.status === 'active' && !isExtended) {
    return null;
  }

  // تصميم خاص للمزادات المباعة في الركن
  if (statusInfo.status === 'sold') {
    return (
      <div
        className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xl backdrop-blur-sm border-2 border-yellow-300 ring-2 ring-yellow-200/50"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.5)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base">✓</span>
          <span>تم البيع</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-lg backdrop-blur-sm ${statusInfo.shouldAnimate ? 'animate-pulse' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${statusInfo.gradient.includes('from-') ? getGradientColors(statusInfo.gradient) : statusInfo.gradient})`,
        boxShadow: `0 2px 8px ${statusInfo.bgColor.replace('bg-', 'rgba(')}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span>{statusInfo.icon}</span>
        <span>{statusInfo.label}</span>
        {statusInfo.shouldAnimate && <Zap className="w-3 h-3 animate-pulse" />}
      </div>
    </div>
  );
}

function getGradientColors(gradient: string): string {
  // تحويل Tailwind gradient إلى CSS gradient
  if (gradient.includes('green')) return '#10b981, #059669';
  if (gradient.includes('red')) return '#ef4444, #dc2626';
  if (gradient.includes('orange')) return '#f97316, #ea580c';
  if (gradient.includes('blue')) return '#3b82f6, #2563eb';
  if (gradient.includes('purple')) return '#a855f7, #9333ea';
  if (gradient.includes('gray')) return '#6b7280, #4b5563';
  if (gradient.includes('yellow')) return '#fbbf24, #f59e0b';
  return '#10b981, #059669'; // default
}
