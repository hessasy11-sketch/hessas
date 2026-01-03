import { Eye, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

interface AuctionStatsProps {
  viewsCount: number;
  biddersCount: number;
  lastActivityAt: string;
}

export function AuctionStats({ viewsCount, biddersCount, lastActivityAt }: AuctionStatsProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        📊 إحصائيات المزاد
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 text-center">
          <Eye className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{viewsCount.toLocaleString('ar-SA')}</div>
          <div className="text-xs text-gray-500">مشاهدة</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{biddersCount.toLocaleString('ar-SA')}</div>
          <div className="text-xs text-gray-500">مزايد</div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
          <div className="text-xs font-bold text-gray-900 mt-1">{formatDistanceToNow(lastActivityAt)}</div>
          <div className="text-xs text-gray-500">آخر نشاط</div>
        </div>
      </div>
    </div>
  );
}
