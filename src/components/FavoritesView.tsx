import { useState } from 'react';
import { ArrowRight, Heart, Trash2, Clock, TrendingUp } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { AuctionDetails } from './AuctionDetails';
import { CountdownTimer } from './CountdownTimer';

interface FavoritesViewProps {
  onBack: () => void;
}

export function FavoritesView({ onBack }: FavoritesViewProps) {
  const { favorites, loading, removeFromFavorites, clearAllFavorites, count } = useFavorites();
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (auctionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(auctionId);
    await removeFromFavorites(auctionId);
    setRemoving(null);
  };

  const handleClearAll = async () => {
    if (window.confirm('هل ترغب بإزالة جميع المزادات من المفضلة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      await clearAllFavorites();
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
  };

  const getAuctionStatus = (auction: any) => {
    const now = new Date();
    const endsAt = new Date(auction.ends_at);

    if (auction.status === 'ended') {
      return { label: 'منتهي', color: 'bg-gray-100 text-gray-700' };
    } else if (endsAt < now) {
      return { label: 'منتهي', color: 'bg-gray-100 text-gray-700' };
    } else if (endsAt.getTime() - now.getTime() < 3600000) {
      return { label: 'قريب من الانتهاء', color: 'bg-orange-100 text-orange-700' };
    } else {
      return { label: 'نشط', color: 'bg-green-100 text-green-700' };
    }
  };

  if (selectedAuction) {
    return (
      <AuctionDetails
        auction={selectedAuction}
        onClose={() => setSelectedAuction(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل المفضلة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Heart className="w-6 h-6 fill-white" />
            مفضلتي الزراعية
          </h2>
          <p className="text-sm text-white/90 mt-1">
            عدد المزادات في المفضلة: {count} مزاد
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 pb-20">
        {favorites.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleClearAll}
              className="bg-red-50 hover:bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md border-2 border-red-200"
            >
              <Trash2 className="w-5 h-5" />
              إزالة الكل من المفضلة
            </button>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <Heart className="w-32 h-32 text-gray-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-1 bg-gray-400 rotate-45 origin-center" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">
              لم تضف أي مزاد إلى مفضلتك بعد
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              تصفّح الحصص الزراعية وأضف ما يعجبك بالضغط على أيقونة القلب
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((auction) => {
              const status = getAuctionStatus(auction);
              const isRemoving = removing === auction.id;

              return (
                <div
                  key={auction.id}
                  onClick={() => setSelectedAuction(auction)}
                  className="bg-white border-2 border-gray-100 hover:border-pink-200 rounded-2xl overflow-hidden transition-all hover:shadow-xl cursor-pointer group"
                >
                  <div className="aspect-video bg-gray-200 relative">
                    {auction.image_url ? (
                      <img
                        src={auction.image_url}
                        alt={auction.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-16 h-16 text-gray-300" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status.color} shadow-md`}>
                        {status.label}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleRemove(auction.id, e)}
                      disabled={isRemoving}
                      className="absolute top-3 left-3 bg-white/90 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-full transition-all shadow-lg disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 text-lg group-hover:text-pink-600 transition-colors">
                      {auction.title}
                    </h3>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          السعر الحالي
                        </span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(Number(auction.current_price))} ريال
                        </span>
                      </div>
                    </div>

                    {auction.status === 'active' && new Date(auction.ends_at) > new Date() && (
                      <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-blue-600 mb-1">ينتهي خلال</div>
                          <CountdownTimer endsAt={auction.ends_at} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
