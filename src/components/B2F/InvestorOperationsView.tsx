import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Package,
  Sprout,
  Sun,
  Droplets,
  Wind,
  TreePine,
  Leaf,
  Wheat,
  Apple,
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  MapPin,
  Factory,
  PlayCircle,
  CheckCircle2,
  Star,
  FileText,
  MessageSquare,
  Award,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InvestorOperationFeesView } from './InvestorOperationFeesView';
import { InvestorVisitRequestView } from './InvestorVisitRequestView';
import { InvestorSeasonDetailsView } from './InvestorSeasonDetailsView';

interface InvestorOperationsViewProps {
  investorPhone: string;
  onBack: () => void;
  onNavigateToService?: () => void;
}

interface Season {
  id: string;
  farm_id: string;
  season_number: number;
  season_year: number;
  status: string;
  current_phase: string;
  progress_percentage: number;
  is_active: boolean;
  start_date: string;
  expected_end_date: string;
  farm_name?: string;
  farm_location?: string;
  investment_request_id?: string;
  contact_name?: string;
  tree_count?: number;
}

interface OperationOrder {
  id: string;
  contract_id: string;
  contract_number: string;
  tree_type: string;
  trees_count: number;
  farm_name: string | null;
  status: 'ready_to_start' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  season_year: number;
  season_name: string | null;
  investor_visible_notes: string | null;
  created_at: string;
  my_rating?: number;
  my_review?: string;
}

interface RatingFormData {
  rating: number;
  review: string;
  selectedReasons: string[];
}

const RATING_REASONS = {
  positive: [
    'جودة المحصول ممتازة',
    'التواصل كان رائعا',
    'التسليم في الوقت المحدد',
    'الرعاية كانت احترافية',
    'تجاوز التوقعات'
  ],
  negative: [
    'جودة المحصول اقل من المتوقع',
    'التواصل كان ضعيفا',
    'تاخر في التسليم',
    'مشاكل في الرعاية',
    'لم يتطابق مع الوصف'
  ]
};

export function InvestorOperationsView({ investorPhone, onBack, onNavigateToService }: InvestorOperationsViewProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [operationOrders, setOperationOrders] = useState<OperationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'operations' | 'seasons' | 'fees' | 'visits'>('operations');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingForm, setRatingForm] = useState<RatingFormData>({
    rating: 0,
    review: '',
    selectedReasons: []
  });

  useEffect(() => {
    loadData();
  }, [investorPhone]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadOperationOrders(), loadSeasons()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperationOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_operations_orders')
        .select(`
          *,
          reviews:b2f_operation_reviews(rating, review)
        `)
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map(op => ({
        ...op,
        my_rating: op.reviews?.[0]?.rating || undefined,
        my_review: op.reviews?.[0]?.review || undefined
      }));

      setOperationOrders(processedData);
    } catch (error) {
      console.error('Error loading operation orders:', error);
    }
  };

  const loadSeasons = async () => {
    try {
      const { data: requests } = await supabase
        .from('b2f_sales_requests')
        .select('id, contact_name, number_of_trees')
        .eq('contact_phone', investorPhone)
        .eq('status', 'transferred_to_operations');

      if (requests && requests.length > 0) {
        const requestIds = requests.map(r => r.id);

        const { data: seasonsData } = await supabase
          .from('b2f_farm_seasons')
          .select(`
            *,
            farm:b2f_farms(name, location)
          `)
          .in('investment_request_id', requestIds)
          .order('created_at', { ascending: false });

        if (seasonsData) {
          setSeasons(seasonsData.map(s => {
            const request = requests.find(r => r.id === s.investment_request_id);
            return {
              ...s,
              farm_name: s.farm?.name,
              farm_location: s.farm?.location,
              contact_name: request?.contact_name,
              tree_count: request?.number_of_trees
            };
          }));
        }
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!showRatingModal || ratingForm.rating === 0) return;

    try {
      setRatingLoading(true);

      const fullReview = [
        ...ratingForm.selectedReasons,
        ratingForm.review
      ].filter(Boolean).join(' | ');

      const { error } = await supabase
        .from('b2f_operation_reviews')
        .insert({
          operation_id: showRatingModal,
          reviewer_phone: investorPhone,
          reviewer_name: 'المستثمر',
          rating: ratingForm.rating,
          review: fullReview || null,
          review_type: 'investor'
        });

      if (error) throw error;

      setShowRatingModal(null);
      setRatingForm({ rating: 0, review: '', selectedReasons: [] });
      await loadOperationOrders();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('حدث خطا اثناء ارسال التقييم');
    } finally {
      setRatingLoading(false);
    }
  };

  const toggleReason = (reason: string) => {
    setRatingForm(prev => ({
      ...prev,
      selectedReasons: prev.selectedReasons.includes(reason)
        ? prev.selectedReasons.filter(r => r !== reason)
        : [...prev.selectedReasons, reason]
    }));
  };

  const renderStars = (rating: number, interactive = false, size = 'md') => {
    const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRatingForm(prev => ({ ...prev, rating: star }))}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star
              className={`${sizeClass} ${
                star <= rating
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getOperationStatusInfo = (status: string) => {
    switch (status) {
      case 'ready_to_start':
        return {
          label: 'في انتظار بدء التشغيل',
          description: 'تم اصدار العقد وعقدك جاهز لبدء التشغيل. فريق المزرعة سيبدا قريبا.',
          color: 'yellow',
          icon: Clock
        };
      case 'in_progress':
        return {
          label: 'جار التشغيل والصيانة',
          description: 'اشجارك تحت الرعاية الان. يتم العمل على صيانتها ومتابعة نموها.',
          color: 'blue',
          icon: PlayCircle
        };
      case 'completed':
        return {
          label: 'اكتمل التشغيل بنجاح',
          description: 'تم اكمال دورة التشغيل والصيانة. يمكنك تقييم الخدمة.',
          color: 'emerald',
          icon: CheckCircle2
        };
      default:
        return {
          label: 'غير معروف',
          description: '',
          color: 'gray',
          icon: AlertCircle
        };
    }
  };

  const getPhaseIcon = (phase: string) => {
    const phaseMap: { [key: string]: any } = {
      'تفعيل التشغيل': Sparkles,
      'الاعداد والجاهزية': Package,
      'بداية الموسم': Sun,
      'الرعاية والري': Droplets,
      'التسميد': Sprout,
      'المكافحة': Wind,
      'النمو': TreePine,
      'الازهار': Leaf,
      'قبل الحصاد': Wheat,
      'العصر والحصاد': Apple
    };
    return phaseMap[phase] || Clock;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'season_activated': 'bg-green-100 text-green-700 border-green-200',
      'season_running': 'bg-blue-100 text-blue-700 border-blue-200',
      'pre_harvest': 'bg-orange-100 text-orange-700 border-orange-200',
      'harvest_phase': 'bg-amber-100 text-amber-700 border-amber-200',
      'season_closed': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'season_activated': 'تم التفعيل',
      'season_running': 'قيد التشغيل',
      'pre_harvest': 'قبل الحصاد',
      'harvest_phase': 'مرحلة الحصاد',
      'season_closed': 'تم الاغلاق'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">جاري تحميل حالة التشغيل...</p>
        </div>
      </div>
    );
  }

  if (selectedSeasonId && activeTab === 'seasons') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <InvestorSeasonDetailsView
          seasonId={selectedSeasonId}
          investorPhone={investorPhone}
          onBack={() => setSelectedSeasonId(null)}
        />
      </div>
    );
  }

  const renderOperationsContent = () => {
    if (operationOrders.length === 0) {
      return (
        <div className="text-center py-16 bg-white rounded-xl">
          <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            لا توجد عمليات تشغيل
          </h3>
          <p className="text-gray-600 mb-4">
            ستظهر هنا حالة تشغيل وصيانة اشجارك بعد اصدار العقد
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {operationOrders.map(operation => {
          const statusInfo = getOperationStatusInfo(operation.status);
          const StatusIcon = statusInfo.icon;
          const canRate = operation.status === 'completed' && !operation.my_rating;

          return (
            <div
              key={operation.id}
              className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${
                operation.status === 'ready_to_start' ? 'border-yellow-200' :
                operation.status === 'in_progress' ? 'border-blue-200' :
                'border-emerald-200'
              }`}
            >
              <div className={`p-1 ${
                operation.status === 'ready_to_start' ? 'bg-yellow-500' :
                operation.status === 'in_progress' ? 'bg-blue-500' :
                'bg-emerald-500'
              }`} />

              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    operation.status === 'ready_to_start' ? 'bg-yellow-100' :
                    operation.status === 'in_progress' ? 'bg-blue-100' :
                    'bg-emerald-100'
                  }`}>
                    <StatusIcon className={`w-7 h-7 ${
                      operation.status === 'ready_to_start' ? 'text-yellow-600' :
                      operation.status === 'in_progress' ? 'text-blue-600' :
                      'text-emerald-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        operation.status === 'ready_to_start' ? 'bg-yellow-100 text-yellow-700' :
                        operation.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{statusInfo.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      رقم العقد
                    </div>
                    <p className="font-bold text-gray-900">{operation.contract_number}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <TreePine className="w-3.5 h-3.5" />
                      عدد الاشجار
                    </div>
                    <p className="font-bold text-gray-900">{operation.trees_count} شجرة {operation.tree_type}</p>
                  </div>
                  {operation.farm_name && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        المزرعة
                      </div>
                      <p className="font-bold text-gray-900">{operation.farm_name}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      الموسم
                    </div>
                    <p className="font-bold text-gray-900">{operation.season_name || operation.season_year}</p>
                  </div>
                </div>

                {operation.started_at && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-blue-600 mb-1">بدا التشغيل في</p>
                    <p className="font-bold text-blue-800">
                      {new Date(operation.started_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {operation.completed_at && (
                  <div className="bg-emerald-50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-emerald-600 mb-1">اكتمل التشغيل في</p>
                    <p className="font-bold text-emerald-800">
                      {new Date(operation.completed_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {operation.investor_visible_notes && (
                      <div className="mt-2 pt-2 border-t border-emerald-200">
                        <p className="text-xs text-emerald-600 mb-1">ملاحظات من الادارة:</p>
                        <p className="text-sm text-emerald-800">{operation.investor_visible_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {operation.my_rating && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 mb-3 border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-xs text-yellow-700 mb-1">تقييمك للخدمة</p>
                        {renderStars(operation.my_rating)}
                      </div>
                    </div>
                    {operation.my_review && (
                      <p className="text-sm text-yellow-800 mt-2 bg-yellow-100/50 p-2 rounded-lg">
                        {operation.my_review}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {canRate && (
                    <button
                      onClick={() => setShowRatingModal(operation.id)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Star className="w-5 h-5" />
                      تقييم التشغيل والصيانة
                    </button>
                  )}

                  {onNavigateToService && (
                    <button
                      onClick={onNavigateToService}
                      className={`${canRate ? '' : 'flex-1'} px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2`}
                    >
                      <MessageSquare className="w-5 h-5" />
                      خدمة المستثمر
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSeasonsContent = () => {
    if (seasons.length === 0) {
      return (
        <div className="text-center py-16 bg-white rounded-xl">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            لا توجد مواسم تشغيلية
          </h3>
          <p className="text-gray-600 mb-4">
            لم يتم تفعيل اي موسم تشغيلي لاستثماراتك بعد
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {seasons.map(season => {
          const PhaseIcon = getPhaseIcon(season.current_phase);

          return (
            <div
              key={season.id}
              className="bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md"
            >
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">
                      {season.farm_name}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {season.farm_location}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(season.status)} bg-white/20 backdrop-blur-sm`}>
                    {getStatusLabel(season.status)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>الموسم {season.season_number} / {season.season_year}</span>
                  </div>
                  {season.tree_count && (
                    <div className="flex items-center gap-1.5">
                      <TreePine className="w-4 h-4" />
                      <span>{season.tree_count} شجرة</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <PhaseIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-emerald-700 font-semibold mb-1">
                        المرحلة الحالية
                      </p>
                      <h4 className="font-bold text-gray-900 text-lg">
                        {season.current_phase}
                      </h4>
                    </div>
                  </div>
                </div>

                {season.is_active && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 font-semibold">التقدم الاجمالي</span>
                      <span className="text-emerald-600 font-bold">
                        {season.progress_percentage}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-300"
                        style={{ width: `${season.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-600">تاريخ البدء</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      {new Date(season.start_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-600">التاريخ المتوقع</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      {new Date(season.expected_end_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSeasonId(season.id)}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Activity className="w-5 h-5" />
                  عرض تفاصيل الموسم
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold">العودة</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">التشغيل والمتابعة</h1>
            <p className="text-white/90">متابعة حالة التشغيل لاستثماراتك</p>
          </div>
          <div className="text-left">
            <div className="text-sm text-white/80">العقود</div>
            <div className="text-3xl font-bold">{operationOrders.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b-2 border-gray-200">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'operations'
                ? 'text-emerald-600 border-b-4 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Factory className="w-5 h-5" />
            <span>التشغيل</span>
            {operationOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'operations' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'
              }`}>
                {operationOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('seasons')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'seasons'
                ? 'text-emerald-600 border-b-4 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>المواسم</span>
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'fees'
                ? 'text-emerald-600 border-b-4 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>الرسوم</span>
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 font-bold transition-colors whitespace-nowrap ${
              activeTab === 'visits'
                ? 'text-emerald-600 border-b-4 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>الزيارات</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'visits' ? (
          <InvestorVisitRequestView investorPhone={investorPhone} />
        ) : activeTab === 'fees' ? (
          <InvestorOperationFeesView investorPhone={investorPhone} />
        ) : activeTab === 'seasons' ? (
          renderSeasonsContent()
        ) : (
          renderOperationsContent()
        )}

        {(activeTab === 'operations' || activeTab === 'seasons') && (operationOrders.length > 0 || seasons.length > 0) && (
          <div className="mt-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">
                  معلومة مهمة
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  يتم ادارة التشغيل والمواسم من قبل فريقنا المختص. سيتم اشعارك تلقائيا باي تحديثات او تغييرات في حالة التشغيل.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">تقييم التشغيل</h2>
                  <p className="text-sm text-gray-600">شاركنا رايك في جودة الخدمة</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">كيف تقيم تجربتك مع التشغيل والصيانة؟</p>
                <div className="flex justify-center">
                  {renderStars(ratingForm.rating, true, 'lg')}
                </div>
                <p className="text-sm font-bold text-gray-900 mt-2">
                  {ratingForm.rating === 0 && 'اختر تقييمك'}
                  {ratingForm.rating === 1 && 'سيء جدا'}
                  {ratingForm.rating === 2 && 'سيء'}
                  {ratingForm.rating === 3 && 'متوسط'}
                  {ratingForm.rating === 4 && 'جيد'}
                  {ratingForm.rating === 5 && 'ممتاز'}
                </p>
              </div>

              {ratingForm.rating > 0 && (
                <>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      {ratingForm.rating >= 4 ? 'ما الذي اعجبك؟' : 'ما الذي يمكن تحسينه؟'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(ratingForm.rating >= 4 ? RATING_REASONS.positive : RATING_REASONS.negative).map(reason => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => toggleReason(reason)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            ratingForm.selectedReasons.includes(reason)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      تعليق اضافي (اختياري)
                    </label>
                    <textarea
                      value={ratingForm.review}
                      onChange={(e) => setRatingForm(prev => ({ ...prev, review: e.target.value }))}
                      placeholder="شاركنا المزيد من التفاصيل..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none h-24"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowRatingModal(null);
                  setRatingForm({ rating: 0, review: '', selectedReasons: [] });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
              >
                الغاء
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={ratingForm.rating === 0 || ratingLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ratingLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                ارسال التقييم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
