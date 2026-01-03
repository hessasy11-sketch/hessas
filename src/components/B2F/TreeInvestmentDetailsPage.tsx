import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  MapPin,
  Calendar,
  TreePine,
  PlayCircle,
  Globe,
  CheckCircle,
  Sparkles,
  Crown,
  Zap,
  AlertCircle,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Target,
  Award,
  Shield,
  Star,
  Heart,
  Leaf
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
interface Farm {
  id: string;
  name: string;
  location: string;
}

interface OpportunityDetails {
  id: string;
  farm_id: string;
  title: string;
  description: string;
  tree_type: string;
  custom_tree_type: string | null;
  investment_type: string;
  price_per_tree: number;
  min_trees: number;
  max_trees: number | null;
  available_trees: number;
  contract_duration_years: number;
  expected_return: string | null;
  badge: string;
  video_url: string | null;
  location_url: string | null;
  images: string[];
  farm?: Farm;
}

interface TreeInvestmentDetailsPageProps {
  opportunityId: string;
  onBack: () => void;
  onSuccess?: () => void;
  onOpenBooking?: (opportunity: OpportunityDetails) => void;
}

const BADGE_CONFIG: Record<string, { label: string; icon: typeof Crown; gradient: string; borderColor: string }> = {
  exclusive: {
    label: 'عرض حصري',
    icon: Crown,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    borderColor: 'border-yellow-300'
  },
  featured: {
    label: 'موصى به',
    icon: Sparkles,
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    borderColor: 'border-emerald-300'
  },
  limited: {
    label: 'عرض محدود',
    icon: Zap,
    gradient: 'from-red-400 via-orange-500 to-pink-500',
    borderColor: 'border-red-300'
  },
  none: {
    label: '',
    icon: Sparkles,
    gradient: 'from-gray-400 to-gray-500',
    borderColor: 'border-gray-300'
  }
};

export function TreeInvestmentDetailsPage({ opportunityId, onBack, onSuccess, onOpenBooking }: TreeInvestmentDetailsPageProps) {
  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageChanging, setIsImageChanging] = useState(false);
  const [statistics, setStatistics] = useState({
    reserved_trees: 0,
    remaining_trees: 0,
    reservation_count: 0
  });
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadOpportunityDetails();
    loadStatistics();
    setIsVisible(true);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [opportunityId]);

  useEffect(() => {
    if (opportunity?.images && opportunity.images.length > 1) {
      const interval = setInterval(() => {
        setIsImageChanging(true);
        setTimeout(() => {
          setCurrentImageIndex((prev) => (prev + 1) % opportunity.images.length);
          setIsImageChanging(false);
        }, 300);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [opportunity]);

  const loadOpportunityDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('b2f_opportunities')
        .select(`
          *,
          farm:b2f_farms(id, name, location)
        `)
        .eq('id', opportunityId)
        .single();

      if (error) throw error;
      setOpportunity(data);
    } catch (error) {
      console.error('Error loading opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_b2f_opportunity_statistics', {
          opportunity_id_param: opportunityId
        });

      if (!error && data) {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        setStatistics({
          reserved_trees: parsedData.reserved_trees || 0,
          remaining_trees: parsedData.remaining_trees || 0,
          reservation_count: parsedData.reservation_count || 0
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const nextImage = () => {
    if (opportunity?.images && opportunity.images.length > 0) {
      setIsImageChanging(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % opportunity.images.length);
        setIsImageChanging(false);
      }, 300);
    }
  };

  const prevImage = () => {
    if (opportunity?.images && opportunity.images.length > 0) {
      setIsImageChanging(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev - 1 + opportunity.images.length) % opportunity.images.length);
        setIsImageChanging(false);
      }, 300);
    }
  };

  const handleOpenBooking = () => {
    if (opportunity && onOpenBooking) {
      onOpenBooking(opportunity);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <TreePine className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-emerald-600 animate-pulse" />
          </div>
          <p className="text-gray-600 font-bold text-lg animate-pulse">جاري تحميل تفاصيل العرض الاستثماري...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">العرض غير موجود</h3>
          <p className="text-gray-600 mb-6">عذراً، لم نتمكن من العثور على تفاصيل هذا العرض</p>
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const badgeConfig = BADGE_CONFIG[opportunity.badge] || BADGE_CONFIG.none;
  const BadgeIcon = badgeConfig.icon;
  const treeTypeName = opportunity.custom_tree_type || opportunity.tree_type;
  const availabilityPercentage = opportunity.available_trees > 0
    ? (statistics.remaining_trees / opportunity.available_trees) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 pb-8 overflow-hidden">
      {/* Floating Decoration Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-green-300/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-teal-200/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      {/* Header */}
      <div className={`sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-lg transition-all duration-300 ${
        scrollY > 50 ? 'shadow-2xl' : 'shadow-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 font-bold transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-md group-hover:shadow-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:-translate-x-1">
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <span className="hidden sm:inline">العودة للعروض</span>
          </button>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-4 py-6 md:py-8 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        {/* Badge with animation */}
        {opportunity.badge !== 'none' && (
          <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${badgeConfig.gradient} text-white px-6 py-3 rounded-full font-bold shadow-xl mb-6 animate-bounce-slow`}>
            <BadgeIcon className="w-5 h-5 animate-pulse" />
            <span>{badgeConfig.label}</span>
            <Star className="w-4 h-4 animate-spin-slow" />
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image Gallery with Enhanced Animation */}
            {opportunity.images && opportunity.images.length > 0 && (
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden group hover:shadow-emerald-500/20 transition-all duration-500 hover:scale-[1.02]">
                <div className="aspect-video relative bg-gradient-to-br from-emerald-100 to-green-100 overflow-hidden">
                  <img
                    src={opportunity.images[currentImageIndex]}
                    alt={opportunity.title}
                    className={`w-full h-full object-cover transition-all duration-700 transform ${
                      isImageChanging ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
                    }`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />

                  {/* Animated Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/50 transition-all duration-300"></div>

                  {/* Floating Icons */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg animate-float">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg animate-float-delayed">
                      <Leaf className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Navigation Buttons with Enhanced Animation */}
                  {opportunity.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-125 hover:-translate-x-2 active:scale-110"
                      >
                        <ChevronLeft className="w-7 h-7 text-gray-900" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-125 hover:translate-x-2 active:scale-110"
                      >
                        <ChevronRight className="w-7 h-7 text-gray-900" />
                      </button>
                    </>
                  )}

                  {/* Enhanced Image Counter */}
                  {opportunity.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg">
                      {currentImageIndex + 1} / {opportunity.images.length}
                    </div>
                  )}
                </div>

                {/* Enhanced Dots Indicator */}
                {opportunity.images.length > 1 && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
                    {opportunity.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setIsImageChanging(true);
                          setTimeout(() => {
                            setCurrentImageIndex(index);
                            setIsImageChanging(false);
                          }, 300);
                        }}
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          index === currentImageIndex
                            ? 'bg-white w-10 shadow-lg'
                            : 'bg-white/50 hover:bg-white/75 w-2.5 hover:w-6'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Title & Location with Animation */}
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-all duration-500 hover:scale-[1.01] animate-slide-in-up">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg flex-shrink-0 animate-pulse-slow hover:scale-110 transition-transform duration-300">
                  <TreePine className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-3 leading-tight bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">{opportunity.title}</h1>
                  {opportunity.farm && (
                    <div className="flex flex-wrap items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 animate-bounce-slow" />
                      <span className="font-bold text-emerald-600">{opportunity.farm.name}</span>
                      <span className="text-gray-400 hidden sm:inline">•</span>
                      <span className="text-sm">{opportunity.farm.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description with Enhanced Style */}
              {opportunity.description && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 md:p-6 border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full animate-pulse"></div>
                    عن هذا الاستثمار
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{opportunity.description}</p>
                </div>
              )}
            </div>

            {/* Investment Details Grid with Stagger Animation */}
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-all duration-500 animate-slide-in-up">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
                  <Target className="w-6 h-6 text-white" />
                </div>
                تفاصيل الاستثمار
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border-2 border-emerald-200 hover:shadow-xl transition-all duration-300 group hover:scale-105 hover:-translate-y-1 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                      <TreePine className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-600">نوع الشجرة</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">{treeTypeName}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border-2 border-blue-200 hover:shadow-xl transition-all duration-300 group hover:scale-105 hover:-translate-y-1 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-600">مدة العقد</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">{opportunity.contract_duration_years} <span className="text-xl">سنوات</span></p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200 hover:shadow-xl transition-all duration-300 group hover:scale-105 hover:-translate-y-1 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-600">السعر للشجرة</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">{opportunity.price_per_tree.toLocaleString()} <span className="text-lg">ريال</span></p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-200 hover:shadow-xl transition-all duration-300 group hover:scale-105 hover:-translate-y-1 animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                      <Users className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-600">الحد الأدنى</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">{opportunity.min_trees} <span className="text-lg">أشجار</span></p>
                </div>
              </div>
            </div>

            {/* Expected Return with Enhanced Animation */}
            {opportunity.expected_return && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-xl p-6 md:p-8 text-white hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-slide-in-up relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                <div className="relative flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-black mb-3 flex items-center gap-2">
                      العائد المتوقع
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </h3>
                    <p className="text-lg md:text-xl font-bold text-white/90">{opportunity.expected_return}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features with Enhanced Interaction */}
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-all duration-500 animate-slide-in-up">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                مميزات الاستثمار
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                  <span className="text-gray-700 font-medium">استثمار بدون تملك - عقد إيجار طويل الأجل</span>
                </div>
                <div className="flex items-start gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                  <span className="text-gray-700 font-medium">إدارة كاملة من المنصة مع متابعة دورية</span>
                </div>
                <div className="flex items-start gap-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                  <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                  <span className="text-gray-700 font-medium">عوائد موسمية مستدامة حسب نوع الشجرة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability Card with Advanced Animation */}
            <div className={`bg-white rounded-3xl shadow-xl p-6 md:p-8 sticky hover:shadow-2xl transition-all duration-500 animate-slide-in-left ${
              scrollY > 200 ? 'top-24' : 'top-24'
            }`}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  الأشجار المتاحة
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                </h3>

                {/* Enhanced Progress Bar */}
                <div className="relative w-full h-5 bg-gray-200 rounded-full overflow-hidden mb-4 shadow-inner">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${availabilityPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                    <p className="text-2xl md:text-3xl font-black text-emerald-600 group-hover:scale-110 transition-transform">{opportunity.available_trees}</p>
                    <p className="text-xs text-gray-600 font-semibold mt-1">إجمالي</p>
                  </div>
                  <div className="text-center bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                    <p className="text-2xl md:text-3xl font-black text-orange-600 group-hover:scale-110 transition-transform">{statistics.reserved_trees}</p>
                    <p className="text-xs text-gray-600 font-semibold mt-1">محجوزة</p>
                  </div>
                  <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                    <p className="text-2xl md:text-3xl font-black text-blue-600 group-hover:scale-110 transition-transform">{statistics.remaining_trees}</p>
                    <p className="text-xs text-gray-600 font-semibold mt-1">متبقية</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 border border-blue-200 mb-6 hover:shadow-md transition-all">
                  <Users className="w-5 h-5 text-blue-600 flex-shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">عدد المستثمرين</p>
                    <p className="text-xl font-black text-blue-600">{statistics.reservation_count}</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="space-y-3">
                {/* Video Button */}
                {opportunity.video_url && (
                  <a
                    href={opportunity.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 group"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <span className="text-lg">شاهد الفيديو</span>
                    <ExternalLink className="w-5 h-5 opacity-75 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                )}

                {/* Location Button */}
                {opportunity.location_url && (
                  <a
                    href={opportunity.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 group"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <span className="text-lg">الموقع على الخريطة</span>
                    <ExternalLink className="w-5 h-5 opacity-75 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                )}

                {/* Arth Website Button */}
                <a
                  href="https://arth.sa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-2xl hover:scale-105 group"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all">
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className="text-lg">زيارة موقع أرث</span>
                  <ExternalLink className="w-5 h-5 opacity-75 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>

                {/* Main Booking Button with Advanced Animation */}
                <div className="relative pt-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur-2xl opacity-40 animate-pulse-slow"></div>
                  <button
                    onClick={handleOpenBooking}
                    disabled={statistics.remaining_trees === 0}
                    className={`relative w-full py-6 px-6 rounded-2xl font-black text-lg transition-all duration-300 shadow-2xl
                      ${statistics.remaining_trees === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white hover:scale-105 hover:shadow-[0_25px_60px_rgba(16,185,129,0.6)] transform active:scale-95'
                      }`}
                  >
                    {statistics.remaining_trees === 0 ? (
                      <span className="flex items-center justify-center gap-2">
                        <AlertCircle className="w-6 h-6" />
                        تم حجز جميع الأشجار
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        <TreePine className="w-6 h-6 animate-bounce-slow" />
                        أريد حجز الأشجار الآن
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Enhanced Note */}
              <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 hover:shadow-lg transition-all">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    <strong>ملاحظة:</strong> العرض يتوقف تلقائياً عند اكتمال عدد المستثمرين. سيتم التواصل معك لإتمام الإجراءات بعد تقديم طلب الحجز.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out forwards;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
