import { X, Share2, Eye, MessageCircle, Clock, MapPin } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { AuctionStatusBadge } from './AuctionStatusBadge';

interface AuctionHeaderProps {
  title: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isExtended?: boolean;
  viewsCount: number;
  biddersCount: number;
  lastActivityAt?: string;
  aiConfidence?: number;
  onClose: () => void;
  onShare: () => void;
}

export function AuctionHeader({
  title,
  location,
  startsAt,
  endsAt,
  status,
  isExtended,
  viewsCount,
  biddersCount,
  lastActivityAt,
  aiConfidence,
  onClose,
  onShare,
}: AuctionHeaderProps) {

  return (
    <div className="sticky top-0 z-50 md:rounded-t-lg overflow-hidden shadow-xl">
      {/* Desktop Layout */}
      <div className="hidden md:block bg-gradient-to-r from-amber-600 to-yellow-600">
        <div className="relative p-4" dir="rtl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AuctionStatusBadge
                startsAt={startsAt}
                endsAt={endsAt}
                dbStatus={status}
                isExtended={isExtended}
                variant="full"
                showTime={true}
                enableRealtime={true}
              />
              {aiConfidence && aiConfidence > 0 && (
                <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                  <div className="text-xs opacity-75">AI</div>
                  <div className="text-sm font-bold">{(aiConfidence * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center">
              <h2 className="text-2xl font-bold text-white mb-1 line-clamp-2">
                {title}
              </h2>
              <div className="flex items-center justify-center gap-3 text-sm text-white/90">
                {location && (
                  <>
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{location}</span>
                    </div>
                    <span className="text-white/50">•</span>
                  </>
                )}
                <CountdownTimer endsAt={endsAt} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-3 min-w-[120px]">
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-4 h-4" />
                <div className="text-xs">
                  <span className="font-bold text-lg">{viewsCount}</span>
                  <span className="text-xs opacity-75 mr-1">مشاهدة</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-4 h-4" />
                <div className="text-xs">
                  <span className="font-bold text-lg">{biddersCount}</span>
                  <span className="text-xs opacity-75 mr-1">مزايد</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-2 left-2 flex gap-1">
            <button
              onClick={onShare}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-full transition-all"
              title="مشاركة"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-full transition-all"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {lastActivityAt && (
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 text-xs text-white/80 text-center border-t border-white/20">
            آخر نشاط: {new Date(lastActivityAt).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {/* Mobile Layout - تصميم جديد كلياً */}
      <div className="md:hidden bg-gradient-to-br from-amber-600 to-yellow-600">
        <div className="p-4" dir="rtl">
          {/* الصف الأول: أزرار التحكم */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <AuctionStatusBadge
                startsAt={startsAt}
                endsAt={endsAt}
                dbStatus={status}
                isExtended={isExtended}
                variant="compact"
                showTime={true}
                enableRealtime={true}
              />
              {aiConfidence && aiConfidence > 0 && (
                <span className="text-[10px] text-white/80">• AI {(aiConfidence * 100).toFixed(0)}%</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onShare}
                className="bg-white/25 hover:bg-white/35 active:bg-white/45 backdrop-blur-sm text-white w-9 h-9 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-lg"
                title="مشاركة"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="bg-white/25 hover:bg-white/35 active:bg-white/45 backdrop-blur-sm text-white w-9 h-9 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-lg"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* الصف الثاني: العنوان والموقع */}
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white leading-tight mb-2 line-clamp-2">
              {title}
            </h2>
            {location && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg inline-flex">
                <MapPin className="w-3 h-3" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* الصف الثالث: المؤقت والإحصائيات */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg">
              <div className="flex items-center justify-center gap-2 text-white">
                <Clock className="w-4 h-4" />
                <div className="text-sm font-bold">
                  <CountdownTimer endsAt={endsAt} />
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg">
              <div className="flex items-center justify-center gap-3 text-white">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-bold">{viewsCount}</span>
                </div>
                <div className="w-px h-4 bg-white/30"></div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-bold">{biddersCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* شريط آخر نشاط للجوال */}
        {lastActivityAt && (
          <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[10px] text-white/80 text-center border-t border-white/20">
            آخر نشاط: {new Date(lastActivityAt).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
