import { X, Bell, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'new_bid' | 'auction_ending' | 'auction_won' | 'auction_closed';
  message: string;
  auctionId: string;
  timestamp: Date;
}

interface NotificationToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationToast({ notifications, onRemove }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_bid':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'auction_ending':
        return <Clock className="w-5 h-5 text-emerald-600" />;
      case 'auction_won':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'auction_closed':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getBackground = (type: Notification['type']) => {
    switch (type) {
      case 'new_bid':
        return 'bg-emerald-50 border-emerald-200';
      case 'auction_ending':
        return 'bg-emerald-50 border-emerald-200';
      case 'auction_won':
        return 'bg-emerald-50 border-emerald-200';
      case 'auction_closed':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="fixed top-20 left-4 z-50 space-y-2 max-w-sm" dir="rtl">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-slide-in ${getBackground(notification.type)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {notification.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {notification.timestamp.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
