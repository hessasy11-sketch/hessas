import { useState, useEffect } from 'react';
import {
  X,
  Home,
  Package,
  PlayCircle,
  FileText,
  LogOut,
  Loader2,
  AlertCircle,
  Lock,
  User,
  HeartHandshake,
  Zap,
  Gift,
  Heart,
  ArrowRightLeft,
  MapPin,
  Sprout,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { InvestorDashboardView } from './InvestorDashboardView';
import { InvestorReservationsView } from './InvestorReservationsView';
import InvestorMyRequestsView from './InvestorMyRequestsView';
import InvestorFinanceView from './InvestorFinanceView';
import InvestorMyTreesOperations from './InvestorMyTreesOperations';
import { UnifiedRegistrationModal } from './UnifiedRegistrationModal';
import { InvestorContractsView } from './InvestorContractsView';
import { InvestorIdentityCard } from './InvestorIdentityCard';
import { JourneyProgressBar } from './JourneyProgressBar';
import { useInvestorJourney } from '../../hooks/useInvestorJourney';
import { useActionRequests, ActionType } from '../../hooks/useActionRequests';
import { MyActionRequestsView } from './MyActionRequestsView';
import { useNewActionsBadge } from '../../hooks/useNewActionsBadge';
import { usePendingPayments } from '../../hooks/usePendingPayments';

interface InvestorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type SidebarView = 'identity' | 'reservations' | 'my-requests' | 'finance' | 'contracts' | 'operations' | 'service' | 'profile' | 'my-actions';
type QuickActionType = 'harvest' | 'gift' | 'charity' | 'transfer' | 'visit' | null;

export function InvestorSidebar({ isOpen, onClose }: InvestorSidebarProps) {
  const { user, account, signOut } = useInvestorAuth();
  const [currentView, setCurrentView] = useState<SidebarView>('identity');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [pendingView, setPendingView] = useState<SidebarView | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionType>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // جلب بيانات مسار المستثمر بشكل لحظي
  const investorJourney = useInvestorJourney(account?.contact_phone || null);

  // جلب الطلبات
  const { createRequest } = useActionRequests(account?.id || null);

  // جلب عدد الإجراءات الجديدة
  const { actionCount } = useNewActionsBadge(account?.contact_phone || null);

  // جلب عدد الطلبات التي تحتاج إثبات سداد
  const { pendingCount } = usePendingPayments(account?.contact_phone || null);

  useEffect(() => {
    if (isOpen) {
      setCurrentView('identity');
    }
  }, [isOpen]);

  const handleQuickAction = async (action: string) => {
    if (action === 'visit') {
      // حفظ الطلب أولاً
      if (account?.id) {
        try {
          await createRequest('visit' as ActionType);
        } catch (error) {
          console.error('Error creating visit request:', error);
        }
      }
      // ثم الانتقال إلى خدمة المستثمر
      setCurrentView('service');
    } else {
      // فتح modal الإجراء
      setActiveQuickAction(action as QuickActionType);
    }
  };

  const handleActionSubmit = async (actionType: ActionType) => {
    if (!account?.id) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      setActionSubmitting(true);
      await createRequest(actionType);
      setActionSuccess(true);

      // إخفاء رسالة النجاح بعد ثانيتين والانتقال لطلباتي
      setTimeout(() => {
        setActionSuccess(false);
        setActiveQuickAction(null);
        setCurrentView('my-actions');
      }, 2000);
    } catch (error) {
      console.error('Error submitting action request:', error);
      alert('حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      setCurrentView('dashboard');
      setShowLogoutConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleNavigate = (view: SidebarView) => {
    if (!user && view !== 'identity') {
      setPendingView(view);
      setShowRegistration(true);
    } else {
      setCurrentView(view);
    }
  };

  const handleRegistrationSuccess = () => {
    console.log('نجح التسجيل - تحديث الواجهة');
    setShowRegistration(false);

    // انتظار قليلاً لضمان تحديث البيانات في Context
    setTimeout(() => {
      if (pendingView) {
        setCurrentView(pendingView);
        setPendingView(null);
      } else {
        // عرض بطاقة الهوية
        setCurrentView('identity');
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay مع تأثير Blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300"
        onClick={onClose}
      />

      {/* الشريط الجانبي المبتكر */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-gradient-to-b from-white via-gray-50 to-white shadow-2xl z-50 transform transition-all duration-300 ease-out flex flex-col">
        {/* Header عصري مع تدرج لوني - أصغر */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 text-white p-4 flex-shrink-0 overflow-hidden">
          {/* عناصر زخرفية للخلفية */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-y-24 translate-x-24"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-y-20 -translate-x-20"></div>
          </div>

          {/* المحتوى */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* أيقونة مميزة */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-xl blur-md"></div>
                <div className="relative bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 shadow-lg">
                  <Sprout className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* النصوص */}
              <div>
                <h2 className="text-xl font-black tracking-tight drop-shadow-sm">
                  {user ? 'حسابي' : 'مرحباً بك'}
                </h2>
                <p className="text-xs text-emerald-50 font-medium">منصة استثمار المزارع</p>
              </div>
            </div>
            {/* زر الإغلاق */}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* بطاقة الهوية الاستثمارية - للمستخدمين المسجلين فقط */}
        {user && !investorJourney.loading && (
          <div className="px-2 pt-2 flex-shrink-0">
            <InvestorIdentityCard
              investorName={investorJourney.name}
              classification={investorJourney.classification}
              totalTrees={investorJourney.totalTrees}
              currentStage={investorJourney.currentStage}
            />
          </div>
        )}

        {/* رسالة الضيف */}
        {!user && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-b border-emerald-100 p-4 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">مرحباً بك في عالم الاستثمار الزراعي</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  انضم إلينا اليوم وابدأ رحلتك نحو استثمار مستدام ومربح
                </p>
                <button
                  onClick={() => setShowRegistration(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm"
                >
                  ابدأ الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu - أزرار أصغر */}
        {user && (
          <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 px-2 py-1.5 flex-shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              {/* ملخص حسابي */}
              <button
                onClick={() => handleNavigate('identity')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'identity'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 hover:text-emerald-600 border border-gray-200 hover:border-emerald-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'identity' ? 'bg-white/20' : 'bg-emerald-50 group-hover:bg-emerald-100'}`}>
                  <Home className={`w-3.5 h-3.5 ${currentView === 'identity' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'identity' ? 'font-black' : ''}`}>
                  ملخص حسابي
                </span>
              </button>

              {/* طلباتي */}
              <button
                onClick={() => handleNavigate('my-requests')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'my-requests'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:text-blue-600 border border-gray-200 hover:border-blue-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'my-requests' ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                  <Package className={`w-3.5 h-3.5 ${currentView === 'my-requests' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'my-requests' ? 'font-black' : ''}`}>
                  طلباتي
                </span>
              </button>

              {/* المالية */}
              <button
                onClick={() => handleNavigate('finance')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'finance'
                    ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 hover:text-purple-600 border border-gray-200 hover:border-purple-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                {/* Badge للطلبات التي تحتاج سداد */}
                {pendingCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                    {pendingCount}
                  </div>
                )}
                <div className={`p-1 rounded-md ${currentView === 'finance' ? 'bg-white/20' : 'bg-purple-50 group-hover:bg-purple-100'}`}>
                  <DollarSign className={`w-3.5 h-3.5 ${currentView === 'finance' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'finance' ? 'font-black' : ''}`}>
                  المالية
                </span>
              </button>

              {/* عقودي */}
              <button
                onClick={() => handleNavigate('contracts')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'contracts'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 hover:text-amber-600 border border-gray-200 hover:border-amber-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'contracts' ? 'bg-white/20' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
                  <FileText className={`w-3.5 h-3.5 ${currentView === 'contracts' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'contracts' ? 'font-black' : ''}`}>
                  عقودي
                </span>
              </button>

              {/* تشغيل أشجاري */}
              <button
                onClick={() => handleNavigate('operations')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'operations'
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-teal-50 hover:to-emerald-50 hover:text-teal-600 border border-gray-200 hover:border-teal-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'operations' ? 'bg-white/20' : 'bg-teal-50 group-hover:bg-teal-100'}`}>
                  <PlayCircle className={`w-3.5 h-3.5 ${currentView === 'operations' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'operations' ? 'font-black' : ''}`}>
                  تشغيل أشجاري
                </span>
              </button>

              {/* خدمة المستثمر */}
              <button
                onClick={() => handleNavigate('service')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'service'
                    ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-300/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 hover:text-rose-600 border border-gray-200 hover:border-rose-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'service' ? 'bg-white/20' : 'bg-rose-50 group-hover:bg-rose-100'}`}>
                  <HeartHandshake className={`w-3.5 h-3.5 ${currentView === 'service' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'service' ? 'font-black' : ''}`}>
                  خدمة المستثمر
                </span>
              </button>

              {/* بياناتي */}
              <button
                onClick={() => handleNavigate('profile')}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                  currentView === 'profile'
                    ? 'bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-md shadow-slate-400/50 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-br hover:from-slate-50 hover:to-gray-50 hover:text-slate-600 border border-gray-200 hover:border-slate-300 hover:scale-105 hover:shadow-sm'
                }`}
              >
                <div className={`p-1 rounded-md ${currentView === 'profile' ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                  <User className={`w-3.5 h-3.5 ${currentView === 'profile' ? 'stroke-[3]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold leading-tight text-center ${currentView === 'profile' ? 'font-black' : ''}`}>
                  بياناتي
                </span>
              </button>
            </div>
          </div>
        )}

        {/* المحتوى الديناميكي */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* صفحة ملخص حسابي */}
          {currentView === 'identity' && user && !investorJourney.loading && (
            <div className="p-4 space-y-4">
              {/* شريط المراحل التفاعلي */}
              <div className="transform hover:scale-[1.01] transition-transform duration-200">
                <JourneyProgressBar
                  status={investorJourney.latestStatus}
                  contractNumber={investorJourney.contractNumber}
                  operationalStatus={investorJourney.operationalStatus}
                />
              </div>

              {/* زر تسجيل الخروج - مبتكر */}
              <button
                onClick={handleLogoutClick}
                className="w-full group relative overflow-hidden bg-white hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 text-gray-700 hover:text-red-600 font-bold py-4 px-5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-red-300 shadow-sm hover:shadow-md hover:scale-[1.02]"
              >
                <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-red-100 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-base">تسجيل الخروج</span>
              </button>
            </div>
          )}

          {/* صفحة ملخص حسابي للضيف */}
          {currentView === 'identity' && !user && (
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">الخدمات المتاحة</h3>
              <div className="space-y-2.5">
                <div className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 rounded-xl opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 block text-sm">حجوزاتي</span>
                      <span className="text-xs text-gray-600">متابعة حجوزاتك الاستثمارية</span>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>

                <div className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 rounded-xl opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 block text-sm">التشغيل والمتابعة</span>
                      <span className="text-xs text-gray-600">طلبات الزيارة والصيانة</span>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>

                <div className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-100 rounded-xl opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 block text-sm">العقود والملفات</span>
                      <span className="text-xs text-gray-600">العقود والشهادات</span>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <p className="text-xs text-amber-900 leading-relaxed flex-1">
                    سجل دخولك الآن للاستفادة من جميع الخدمات ومتابعة استثماراتك بسهولة
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'reservations' && user && account && (
            <InvestorReservationsView
              key={account.contact_phone}
              investorPhone={account.contact_phone}
              onBack={() => setCurrentView('identity')}
            />
          )}

          {currentView === 'operations' && user && account && (
            <InvestorMyTreesOperations />
          )}

          {currentView === 'contracts' && account && (
            <InvestorContractsView investorPhone={account.contact_phone} />
          )}

          {/* خدمة المستثمر */}
          {currentView === 'service' && user && (
            <div className="p-4 space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 shadow-sm border-2 border-rose-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <HeartHandshake className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  خدمة المستثمر
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  اختر الإجراء المناسب وسنساعدك في إتمامه
                </p>
              </div>

              {/* قائمة الإجراءات */}
              <div className="space-y-3">
                {[
                  {
                    id: 'harvest',
                    label: 'استلام المحصول',
                    icon: Package,
                    color: 'from-emerald-500 to-green-600',
                    description: 'طلب استلام المحصول من أشجارك'
                  },
                  {
                    id: 'gift',
                    label: 'إهداء',
                    icon: Gift,
                    color: 'from-pink-500 to-rose-600',
                    description: 'إهداء محصولك لشخص عزيز'
                  },
                  {
                    id: 'charity',
                    label: 'صدقة / وقف',
                    icon: Heart,
                    color: 'from-teal-500 to-emerald-600',
                    description: 'التبرع بالمحصول كصدقة جارية'
                  },
                  {
                    id: 'transfer',
                    label: 'نقل عقد',
                    icon: ArrowRightLeft,
                    color: 'from-blue-500 to-cyan-600',
                    description: 'نقل ملكية العقد لشخص آخر'
                  },
                  {
                    id: 'visit',
                    label: 'زيارة / استفسار',
                    icon: MapPin,
                    color: 'from-amber-500 to-orange-600',
                    description: 'طلب زيارة المزرعة أو استفسار عام'
                  }
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.id)}
                      className="w-full group"
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                        <div className="relative bg-white group-hover:bg-transparent p-4 flex items-center gap-4 transition-colors duration-300">
                          <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-1 text-right">
                            <h4 className="font-black text-gray-900 group-hover:text-white transition-colors duration-300 mb-1">
                              {action.label}
                            </h4>
                            <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors duration-300">
                              {action.description}
                            </p>
                          </div>

                          <div className="w-8 h-8 bg-gray-100 group-hover:bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:translate-x-[-4px]">
                            <svg
                              className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors duration-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">
                  فريقنا جاهز لمساعدتك في أي وقت
                </p>
              </div>
            </div>
          )}

          {/* طلباتي (الجديد) */}
          {currentView === 'my-requests' && user && account && (
            <div className="p-4">
              <InvestorMyRequestsView />
            </div>
          )}

          {/* المالية */}
          {currentView === 'finance' && user && account && (
            <div className="p-4">
              <InvestorFinanceView />
            </div>
          )}

          {/* طلباتي */}
          {currentView === 'my-actions' && user && account && (
            <div className="p-4">
              <MyActionRequestsView />
            </div>
          )}

          {/* بياناتي */}
          {currentView === 'profile' && user && account && (
            <div className="p-4">
              <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-100 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4 pb-4 border-b-2 border-gray-100">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-gray-300 rounded-2xl blur-md"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-slate-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-md">
                      <User className="w-7 h-7 text-slate-700" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">بياناتي الشخصية</h3>
                    <p className="text-sm text-gray-500 font-medium">معلوماتك المسجلة</p>
                  </div>
                </div>

                {/* البيانات */}
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border-2 border-emerald-100">
                    <p className="text-xs text-emerald-600 font-bold mb-1.5">الاسم</p>
                    <p className="text-base font-black text-gray-900">{account.contact_name}</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border-2 border-blue-100">
                    <p className="text-xs text-blue-600 font-bold mb-1.5">رقم الجوال</p>
                    <p className="text-base font-black text-gray-900 text-left" dir="ltr">{account.contact_phone}</p>
                  </div>

                  {account.contact_email && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-100">
                      <p className="text-xs text-amber-600 font-bold mb-1.5">البريد الإلكتروني</p>
                      <p className="text-base font-black text-gray-900 text-left" dir="ltr">{account.contact_email}</p>
                    </div>
                  )}
                </div>

                {/* زر تسجيل الخروج */}
                <button
                  onClick={handleLogoutClick}
                  className="w-full group relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 font-bold py-4 px-5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 border-2 border-red-200 hover:border-red-300 shadow-sm hover:shadow-md mt-4 hover:scale-[1.02]"
                >
                  <div className="p-2 rounded-xl bg-red-100 group-hover:bg-red-200 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-base">تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">هل تريد المغادرة؟</h3>
                <p className="text-sm text-gray-600">نأمل أن نراك قريباً</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 mb-6 border border-emerald-100">
              <p className="text-sm text-emerald-900 leading-relaxed">
                استثمارك بأمان معنا. يمكنك العودة في أي وقت لمتابعة أشجارك ومشاهدة تقدمها
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelLogout}
                disabled={loggingOut}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                البقاء
              </button>
              <button
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الخروج...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-5 h-5" />
                    <span>تسجيل الخروج</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnifiedRegistrationModal
        isOpen={showRegistration}
        onClose={() => {
          setShowRegistration(false);
          setPendingView(null);
        }}
        onSuccess={handleRegistrationSuccess}
        context="sidebar"
      />

      {/* Modal: استلام المحصول */}
      {activeQuickAction === 'harvest' && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] animate-in fade-in"
            onClick={() => setActiveQuickAction(null)}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">استلام المحصول</h3>
                  </div>
                  <button
                    onClick={() => setActiveQuickAction(null)}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/90">
                  اطلب استلام المحصول من أشجارك
                </p>
              </div>

              <div className="p-6 space-y-4">
                {actionSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
                    <p className="text-emerald-900 font-bold mb-2">تم إرسال الطلب بنجاح!</p>
                    <p className="text-sm text-emerald-700">سيتم التواصل معك قريباً</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-sm text-emerald-900 leading-relaxed">
                        <span className="font-bold">عزيزي المستثمر،</span>
                        <br />
                        سيتم التواصل معك قريباً لترتيب استلام المحصول.
                        يرجى التأكد من صحة معلومات الاتصال الخاصة بك.
                      </p>
                    </div>

                    <button
                      onClick={() => handleActionSubmit('harvest')}
                      disabled={actionSubmitting}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        'تأكيد الطلب'
                      )}
                    </button>

                    <button
                      onClick={() => setActiveQuickAction(null)}
                      disabled={actionSubmitting}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: إهداء */}
      {activeQuickAction === 'gift' && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] animate-in fade-in"
            onClick={() => setActiveQuickAction(null)}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Gift className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">إهداء المحصول</h3>
                  </div>
                  <button
                    onClick={() => setActiveQuickAction(null)}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/90">
                  أهدِ محصولك لشخص عزيز
                </p>
              </div>

              <div className="p-6 space-y-4">
                {actionSuccess ? (
                  <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-pink-600 mx-auto mb-3" />
                    <p className="text-pink-900 font-bold mb-2">تم إرسال الطلب بنجاح!</p>
                    <p className="text-sm text-pink-700">سيتم التواصل معك قريباً</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                      <p className="text-sm text-pink-900 leading-relaxed">
                        <span className="font-bold">هدية مباركة،</span>
                        <br />
                        يمكنك إهداء محصولك لأي شخص تحبه.
                        سيتم التواصل معك لاستكمال تفاصيل الإهداء.
                      </p>
                    </div>

                    <button
                      onClick={() => handleActionSubmit('gift')}
                      disabled={actionSubmitting}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        'تأكيد الطلب'
                      )}
                    </button>

                    <button
                      onClick={() => setActiveQuickAction(null)}
                      disabled={actionSubmitting}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: صدقة / وقف */}
      {activeQuickAction === 'charity' && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] animate-in fade-in"
            onClick={() => setActiveQuickAction(null)}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">صدقة / وقف</h3>
                  </div>
                  <button
                    onClick={() => setActiveQuickAction(null)}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/90">
                  تبرع بمحصولك لوجه الله
                </p>
              </div>

              <div className="p-6 space-y-4">
                {actionSuccess ? (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-3" />
                    <p className="text-teal-900 font-bold mb-2">تم إرسال الطلب بنجاح!</p>
                    <p className="text-sm text-teal-700">بارك الله فيك وتقبل منك</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                      <p className="text-sm text-teal-900 leading-relaxed">
                        <span className="font-bold">بارك الله فيك،</span>
                        <br />
                        يمكنك التبرع بمحصولك كصدقة جارية أو وقف.
                        سنتواصل معك لاستكمال إجراءات التبرع.
                      </p>
                    </div>

                    <button
                      onClick={() => handleActionSubmit('charity')}
                      disabled={actionSubmitting}
                      className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        'تأكيد الطلب'
                      )}
                    </button>

                    <button
                      onClick={() => setActiveQuickAction(null)}
                      disabled={actionSubmitting}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: نقل عقد */}
      {activeQuickAction === 'transfer' && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] animate-in fade-in"
            onClick={() => setActiveQuickAction(null)}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">نقل العقد</h3>
                  </div>
                  <button
                    onClick={() => setActiveQuickAction(null)}
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-white/90">
                  انقل ملكية العقد لشخص آخر
                </p>
              </div>

              <div className="p-6 space-y-4">
                {actionSuccess ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                    <p className="text-blue-900 font-bold mb-2">تم إرسال الطلب بنجاح!</p>
                    <p className="text-sm text-blue-700">سيتم التواصل معك قريباً</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-900 leading-relaxed">
                        <span className="font-bold">نقل الملكية،</span>
                        <br />
                        يمكنك نقل ملكية عقدك لشخص آخر.
                        سيتم التواصل معك لاستكمال الإجراءات القانونية.
                      </p>
                    </div>

                    <button
                      onClick={() => handleActionSubmit('transfer')}
                      disabled={actionSubmitting}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        'تأكيد الطلب'
                      )}
                    </button>

                    <button
                      onClick={() => setActiveQuickAction(null)}
                      disabled={actionSubmitting}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
