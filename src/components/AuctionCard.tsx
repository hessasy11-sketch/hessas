import { MapPin, Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useRegionsAndCities } from '../hooks/useRegionsAndCities';
import { AuctionStatusBadge, AuctionStatusCornerBadge } from './AuctionStatusBadge';

interface Auction {
  id: string;
  title: string;
  description: string | null;
  current_price: number;
  starting_price: number;
  images: string[];
  status: string;
  starts_at: string;
  ends_at: string;
  region_id?: string | null;
  city_id?: string | null;
  location: string | null;
  seller_plan_type?: string;
  is_featured?: boolean;
  priority_score?: number;
  is_extended?: boolean;
}

interface AuctionCardProps {
  auction: Auction;
  onClick: () => void;
  sectionColor?: string;
}


export function AuctionCard({ auction, onClick, sectionColor = '#10b981' }: AuctionCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getRegionById, getCityById } = useRegionsAndCities();
  const isFav = isFavorite(auction.id);
  const planType = auction.seller_plan_type || 'free';

  const locationText = auction.region_id && auction.city_id
    ? `${getRegionById(auction.region_id)?.name_ar} - ${getCityById(auction.city_id)?.name_ar}`
    : auction.location || 'غير محدد';

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(auction.id);
  };

  const getPlanBadge = () => {
    if (planType === 'gold') {
      return (
        <div className="absolute bottom-2 left-2 z-20 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-2.5 py-1 rounded-full shadow-xl flex items-center gap-1 animate-pulse ring-2 ring-yellow-200/50 backdrop-blur-sm">
          <span className="text-xs font-bold text-white drop-shadow-md">⭐ مميز</span>
        </div>
      );
    }
    if (planType === 'silver') {
      return (
        <div className="absolute bottom-2 left-2 z-20 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 ring-2 ring-gray-200/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
          <span className="text-xs font-bold text-white drop-shadow-md">💎</span>
        </div>
      );
    }
    return null;
  };

  const getBorderStyle = () => {
    if (planType === 'gold') {
      return 'border-2 border-yellow-400 shadow-lg shadow-yellow-100 ring-1 ring-yellow-200/50';
    }
    if (planType === 'silver') {
      return 'border-2 border-gray-300 shadow-md ring-1 ring-gray-200/50';
    }
    return 'border border-gray-200 hover:border-emerald-200';
  };

  const getCardClassName = () => {
    let baseClass = 'relative bg-white backdrop-blur-sm rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group';

    if (planType === 'gold') {
      return `${baseClass} hover:shadow-2xl hover:shadow-yellow-200/50`;
    }
    if (planType === 'silver') {
      return `${baseClass} hover:shadow-2xl hover:shadow-gray-200/50`;
    }
    return `${baseClass} hover:shadow-xl hover:shadow-emerald-100/50`;
  };

  return (
    <div
      onClick={onClick}
      className={`${getCardClassName()} ${getBorderStyle()}`}
      dir="rtl"
      style={{
        boxShadow: planType === 'gold'
          ? '0 8px 25px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(251, 191, 36, 0.15)'
          : planType === 'silver'
          ? '0 6px 20px rgba(156, 163, 175, 0.2), 0 2px 6px rgba(156, 163, 175, 0.1)'
          : '0 4px 15px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)',
        transform: 'translateZ(0)',
        willChange: 'transform, box-shadow',
      }}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* 3D lift effect layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Golden glow for premium cards */}
      {planType === 'gold' && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-yellow-600/10 pointer-events-none" />
      )}

      {/* Silver shimmer for silver cards */}
      {planType === 'silver' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-300/10 via-transparent to-gray-400/10 pointer-events-none" />
      )}

      {getPlanBadge()}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-1.5 left-1.5 z-10 bg-white/95 hover:bg-white backdrop-blur-md p-1.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95"
      >
        <Heart
          className={`w-5 h-5 transition-all duration-300 ${
            isFav ? 'fill-pink-500 text-pink-500 animate-pulse' : 'text-gray-400 hover:text-pink-400'
          }`}
        />
      </button>
      <div className="flex gap-2.5 p-3 relative z-[1]">
        {/* المعلومات على اليمين */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 transform transition-transform duration-300 group-hover:translate-x-0.5">
          {/* العنوان */}
          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 transition-colors duration-200 group-hover:text-gray-800">
            {auction.title}
          </h3>

          {/* السعر الحالي */}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-gray-900 transition-all duration-300 group-hover:text-2xl group-hover:text-emerald-600">
              {auction.current_price.toLocaleString('ar-SA')}
            </span>
            <span className="text-sm text-gray-600 font-bold transition-colors duration-300 group-hover:text-emerald-600">ر.س</span>
          </div>

          {/* الموقع */}
          <div className="flex items-center gap-1 text-xs text-gray-500 transition-all duration-200 group-hover:text-gray-700">
            <MapPin className="w-3.5 h-3.5 text-gray-400 transition-colors duration-200 group-hover:text-emerald-500" />
            <span className="font-medium">{locationText}</span>
          </div>

          {/* شارة الحالة الديناميكية */}
          <div className="transform transition-all duration-300 group-hover:scale-105">
            <AuctionStatusBadge
              startsAt={auction.starts_at}
              endsAt={auction.ends_at}
              dbStatus={auction.status}
              isExtended={auction.is_extended}
              variant="compact"
              showTime={true}
              enableRealtime={true}
            />
          </div>
        </div>

        {/* الصورة على اليسار - 35% */}
        <div className="relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-md ring-2 ring-white/50 transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 group-hover:ring-4 group-hover:ring-emerald-100">
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />

          {auction.images.length > 0 ? (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:rotate-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl transition-transform duration-300 group-hover:scale-110">
              🌾
            </div>
          )}
        </div>
      </div>

      {/* شارة الحالة في الزاوية */}
      <AuctionStatusCornerBadge
        startsAt={auction.starts_at}
        endsAt={auction.ends_at}
        dbStatus={auction.status}
        isExtended={auction.is_extended}
        enableRealtime={true}
      />
    </div>
  );
}
