import { useState, useEffect } from 'react';
import { MapPin, Clock, TrendingUp, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OpportunityCardProps {
  opportunity: {
    id: string;
    title: string;
    farm_name: string;
    city_name: string | null;
    tree_types: string[];
    price_per_tree: number;
    number_of_trees: number;
    duration_months: number;
    limited_offer_enabled: boolean;
    limited_offer_title: string | null;
    limited_offer_end: string | null;
    is_offer_active: boolean;
    images: string[];
    farm_images: string[];
    farm_main_image: string | null;
    is_active: boolean;
  };
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const [reservedTrees, setReservedTrees] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservedTrees();
  }, [opportunity.id]);

  const loadReservedTrees = async () => {
    try {
      const { data, error } = await supabase
        .from('tree_rental_reservations')
        .select('number_of_trees')
        .eq('opportunity_id', opportunity.id)
        .in('status', ['pending_review', 'waiting_payment', 'receipt_under_review', 'active']);

      if (error) throw error;

      const total = (data || []).reduce((sum, booking) => sum + booking.number_of_trees, 0);
      setReservedTrees(total);
    } catch (err) {
      console.error('Error loading reserved trees:', err);
      setReservedTrees(0);
    } finally {
      setLoading(false);
    }
  };

  const totalTrees = opportunity.number_of_trees;
  const remainingTrees = totalTrees - reservedTrees;
  const reservationPercentage = totalTrees > 0 ? (reservedTrees / totalTrees) * 100 : 0;

  const isAlmostFull = reservationPercentage >= 70;
  const isVeryLimited = reservationPercentage >= 90;
  const isSoldOut = remainingTrees <= 0;

  const allImages = [...(opportunity.images || []), ...(opportunity.farm_images || [])];
  const mainImage = allImages[0] || opportunity.farm_main_image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800';
  const treeType = opportunity.tree_types && opportunity.tree_types.length > 0 ? opportunity.tree_types[0] : 'أشجار مثمرة';

  const getTreeEmoji = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('نخيل') || lowerType.includes('نخل')) return '🌴';
    if (lowerType.includes('زيتون')) return '🫒';
    if (lowerType.includes('رمان')) return '🍎';
    if (lowerType.includes('تين')) return '🍇';
    if (lowerType.includes('برتقال') || lowerType.includes('ليمون')) return '🍊';
    return '🌳';
  };

  const getDurationLabel = (months: number) => {
    if (months === 12) return 'عقد سنوي';
    if (months === 6) return 'موسم واحد';
    if (months === 24) return 'عقد سنتين';
    return `${months} شهر`;
  };

  const isOfferActive = opportunity.is_offer_active && opportunity.limited_offer_enabled;

  const getTimeRemaining = () => {
    if (!opportunity.limited_offer_end) return null;

    const end = new Date(opportunity.limited_offer_end);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `متبقي ${days} يوم`;
    if (hours > 0) return `متبقي ${hours} ساعة`;
    return 'ينتهي قريباً';
  };

  const getProgressBarColor = () => {
    if (isSoldOut) return 'bg-gray-400';
    if (isVeryLimited) return 'bg-red-500';
    if (isAlmostFull) return 'bg-orange-500';
    return 'bg-green-600';
  };

  return (
    <div
      onClick={!isSoldOut ? onClick : undefined}
      className={`group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 transition-all duration-300 ${
        isSoldOut
          ? 'opacity-75 cursor-default'
          : 'hover:shadow-2xl hover:scale-[1.02] hover:border-amber-300 cursor-pointer'
      }`}
      dir="rtl"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={mainImage}
          alt={opportunity.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <span className="text-lg">{getTreeEmoji(treeType)}</span>
            <span className="text-sm font-bold text-gray-800">{treeType}</span>
          </div>

          {isOfferActive && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white">
                {opportunity.limited_offer_title || 'عرض لمدة محدودة'}
              </span>
            </div>
          )}
        </div>

        {isSoldOut && (
          <div className="absolute top-4 left-4">
            <div className="bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-bold text-white">اكتمل الحجز</span>
            </div>
          </div>
        )}

        {!isSoldOut && isVeryLimited && (
          <div className="absolute top-4 left-4">
            <div className="bg-red-600 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
              <AlertCircle className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white">
                متبقي {remainingTrees} شجرة فقط
              </span>
            </div>
          </div>
        )}

        {!isSoldOut && isAlmostFull && !isVeryLimited && (
          <div className="absolute top-4 left-4">
            <div className="bg-orange-500 px-3 py-1.5 rounded-full shadow-lg">
              <span className="text-xs font-bold text-white">اقترب من الاكتمال</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors">
            {opportunity.title}
          </h3>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            {opportunity.city_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{opportunity.city_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>مدة الإيجار: {getDurationLabel(opportunity.duration_months)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 mb-4 border border-amber-200">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">إجمالي الأشجار</div>
              <div className="text-lg font-bold text-gray-900">{totalTrees}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">الأشجار المتبقية</div>
              <div className="text-lg font-bold text-amber-700">{remainingTrees}</div>
            </div>
          </div>

          {isOfferActive && getTimeRemaining() && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-purple-700">{getTimeRemaining()}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>تقدم الحجز</span>
              <span className="font-bold">{reservationPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${Math.min(reservationPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              محجوز {reservedTrees} من {totalTrees} شجرة
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-bold text-gray-900">مميزات هذا العرض:</h4>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700 leading-relaxed">متابعة دورية للمزرعة عن طريق المنصة</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700 leading-relaxed">موسم حصاد كامل مع تقارير وصور</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700 leading-relaxed">لا تحتاج زيارة المزرعة، كل شيء تديره المنصة</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">سعر الشجرة الواحدة</div>
            <div className="text-2xl font-bold text-amber-700 mb-1">
              {opportunity.price_per_tree.toLocaleString('ar-SA')} <span className="text-lg">ريال</span>
            </div>
            <div className="text-xs text-gray-500">العقد عبر منصة حصص زراعية</div>
          </div>

          <button
            disabled={isSoldOut}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
              isSoldOut
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 hover:shadow-lg hover:scale-105'
            }`}
          >
            {isSoldOut ? (
              'اكتمل الحجز'
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                ابدأ حجز أشجارك
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
