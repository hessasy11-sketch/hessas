import { Home, Heart, Star, MessageCircle, Share2 } from 'lucide-react';

interface AuctionFooterProps {
  onClose: () => void;
  onToggleFavorite: () => void;
  onRate: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  isFavorite: boolean;
}

export function AuctionFooter({
  onClose,
  onToggleFavorite,
  onRate,
  onWhatsApp,
  onShare,
  isFavorite
}: AuctionFooterProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 py-3 px-4"
      style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(245, 158, 11, 0.95) 50%, rgba(251, 191, 36, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 16px rgba(245, 158, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-around gap-2" dir="rtl">
        <button
          onClick={onClose}
          className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition-all group"
          title="العودة للرئيسية"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-all group-hover:scale-110">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">الرئيسية</span>
        </button>

        <button
          onClick={onToggleFavorite}
          className={`flex flex-col items-center gap-1 transition-all group ${
            isFavorite ? 'text-red-200' : 'text-white hover:text-white/80'
          }`}
          title="المفضلة"
        >
          <div className={`p-2.5 rounded-full transition-all group-hover:scale-110 ${
            isFavorite ? 'bg-red-500/80' : 'bg-white/20 group-hover:bg-white/30'
          }`}>
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </div>
          <span className="text-xs font-medium">المفضلة</span>
        </button>

        <button
          onClick={onRate}
          className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition-all group"
          title="تقييم البائع"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-all group-hover:scale-110">
            <Star className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">تقييم</span>
        </button>

        <button
          onClick={onWhatsApp}
          className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition-all group"
          title="واتساب"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-all group-hover:scale-110">
            <MessageCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">واتساب</span>
        </button>

        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 text-white hover:text-white/80 transition-all group"
          title="مشاركة"
        >
          <div className="p-2.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-all group-hover:scale-110">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">مشاركة</span>
        </button>
      </div>
    </div>
  );
}
