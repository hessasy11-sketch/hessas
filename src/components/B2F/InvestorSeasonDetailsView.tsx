import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Leaf,
  Droplets,
  Sun,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Award,
  Activity,
  Sprout,
  Apple,
  Wheat
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvestorSeasonDetailsViewProps {
  seasonId: string;
  investorPhone: string;
  onBack: () => void;
}

export function InvestorSeasonDetailsView({ seasonId, investorPhone, onBack }: InvestorSeasonDetailsViewProps) {
  const [season, setSeason] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [operationFees, setOperationFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasonDetails();
  }, [seasonId, investorPhone]);

  const loadSeasonDetails = async () => {
    try {
      setLoading(true);

      // Load season with farm
      const { data: seasonData } = await supabase
        .from('farm_seasons')
        .select(`
          *,
          farm:b2f_farms(id, name, location)
        `)
        .eq('id', seasonId)
        .single();

      if (seasonData) {
        setSeason(seasonData);
      }

      // Load phases
      const { data: phasesData } = await supabase
        .from('season_phases')
        .select('*')
        .eq('season_id', seasonId)
        .order('phase_order', { ascending: true });

      setPhases(phasesData || []);

      // Load operation fees for this investor
      const { data: feesData } = await supabase
        .from('operation_fees')
        .select('*')
        .eq('season_id', seasonId)
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false });

      setOperationFees(feesData || []);

    } catch (error) {
      console.error('Error loading season details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: any = {
      active: {
        text: 'التشغيل نشط',
        emoji: '🌿',
        color: 'bg-green-100 text-green-700 border-green-300',
        gradient: 'from-green-50 to-emerald-50'
      },
      production: {
        text: 'في مرحلة الإنتاج',
        emoji: '🍈',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        gradient: 'from-blue-50 to-cyan-50'
      },
      harvest: {
        text: 'في مرحلة الحصاد',
        emoji: '🫒',
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        gradient: 'from-orange-50 to-amber-50'
      },
      completed: {
        text: 'تم تسليم الموسم',
        emoji: '📦',
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        gradient: 'from-purple-50 to-pink-50'
      },
      pending: {
        text: 'قيد الإعداد',
        emoji: '⏳',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        gradient: 'from-gray-50 to-slate-50'
      }
    };
    return configs[status] || configs.pending;
  };

  const getPhaseIcon = (phaseName: string) => {
    const name = phaseName.toLowerCase();
    if (name.includes('ري') || name.includes('سقي')) return Droplets;
    if (name.includes('تسميد') || name.includes('سماد')) return Leaf;
    if (name.includes('رش') || name.includes('مبيد')) return Sun;
    if (name.includes('حصاد') || name.includes('قطف')) return Apple;
    if (name.includes('عصر') || name.includes('معصرة')) return Package;
    if (name.includes('زراعة') || name.includes('غرس')) return Sprout;
    if (name.includes('تقليم') || name.includes('تشذيب')) return Wheat;
    return Activity;
  };

  const getFeesStatusConfig = () => {
    if (operationFees.length === 0) {
      return {
        text: 'لا توجد رسوم',
        color: 'bg-gray-100 text-gray-700',
        icon: Clock
      };
    }

    const unpaidFees = operationFees.filter(f => f.status === 'pending' || f.status === 'rejected');
    const overdueFees = operationFees.filter(f =>
      (f.status === 'pending' || f.status === 'rejected') &&
      new Date(f.due_date) < new Date()
    );

    if (overdueFees.length > 0) {
      return {
        text: 'رسوم متأخرة',
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: AlertCircle
      };
    }

    if (unpaidFees.length > 0) {
      return {
        text: 'بانتظار السداد',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: Clock
      };
    }

    return {
      text: 'جميع الرسوم مدفوعة',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <p className="text-center text-gray-600">لم يتم العثور على الموسم</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(season.current_status);
  const feesConfig = getFeesStatusConfig();
  const FeesIcon = feesConfig.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">رجوع</span>
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {season.farm?.name}
            </h2>
            <p className="text-gray-600">
              موسم {season.season_number} - {season.season_year}
            </p>
          </div>
        </div>
      </div>

      {/* Season Status Card */}
      <div className={`bg-gradient-to-br ${statusConfig.gradient} border-2 ${statusConfig.color.split(' ').pop()?.replace('text-', 'border-')} rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{statusConfig.emoji}</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">حالة الموسم</h3>
              <p className={`text-lg font-bold ${statusConfig.color.split(' ')[1]}`}>
                {statusConfig.text}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">تاريخ البداية</span>
            </div>
            <p className="font-bold text-gray-900">
              {new Date(season.start_date).toLocaleDateString('ar-SA')}
            </p>
          </div>

          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">تاريخ النهاية المتوقع</span>
            </div>
            <p className="font-bold text-gray-900">
              {season.expected_end_date
                ? new Date(season.expected_end_date).toLocaleDateString('ar-SA')
                : 'لم يحدد بعد'
              }
            </p>
          </div>

          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">المرحلة الحالية</span>
            </div>
            <p className="font-bold text-gray-900">
              {season.current_phase || 'لم تبدأ بعد'}
            </p>
          </div>
        </div>
      </div>

      {/* Phases Progress */}
      {phases.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">مراحل الموسم</h3>
          </div>

          <div className="space-y-3">
            {phases.map((phase, index) => {
              const PhaseIcon = getPhaseIcon(phase.phase_name);
              const isCompleted = phase.status === 'completed';
              const isActive = phase.status === 'in_progress';
              const isPending = phase.status === 'pending';

              return (
                <div key={phase.id} className="relative">
                  {index < phases.length - 1 && (
                    <div className={`absolute right-5 top-12 w-0.5 h-8 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}

                  <div className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? 'bg-green-50 border-green-200'
                      : isActive
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <PhaseIcon className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{phase.phase_name}</h4>
                      {phase.description && (
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      )}
                    </div>

                    <div className="text-right">
                      {isCompleted && phase.completed_at && (
                        <div className="text-xs text-green-600 font-medium">
                          تم في {new Date(phase.completed_at).toLocaleDateString('ar-SA')}
                        </div>
                      )}
                      {isActive && (
                        <div className="text-xs text-blue-600 font-bold">
                          جاري التنفيذ الآن
                        </div>
                      )}
                      {isPending && (
                        <div className="text-xs text-gray-500">
                          قريباً
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operation Fees Status */}
      <div className={`rounded-xl border-2 p-6 ${feesConfig.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FeesIcon className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">رسوم التشغيل</h3>
              <p className="font-bold">{feesConfig.text}</p>
            </div>
          </div>

          {operationFees.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">إجمالي الرسوم</p>
              <p className="text-xl font-bold text-gray-900">
                {operationFees.reduce((sum, fee) => sum + (fee.amount || 0), 0)} ريال
              </p>
            </div>
          )}
        </div>

        {operationFees.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white bg-opacity-60 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">مدفوعة</p>
              <p className="text-lg font-bold text-green-600">
                {operationFees.filter(f => f.status === 'paid').length}
              </p>
            </div>
            <div className="bg-white bg-opacity-60 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">قيد الانتظار</p>
              <p className="text-lg font-bold text-yellow-600">
                {operationFees.filter(f => f.status === 'pending').length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Download Section - Only show if season is completed */}
      {season.current_status === 'completed' && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-8 h-8 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900">ملفات الموسم</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href={`#download-report-${season.id}`}
              className="flex items-center gap-3 bg-white border-2 border-purple-300 rounded-lg p-4 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">تقرير الموسم</h4>
                <p className="text-sm text-gray-600">تحميل التقرير الكامل</p>
              </div>
              <Download className="w-5 h-5 text-purple-600" />
            </a>

            <a
              href={`#download-certificate-${season.id}`}
              className="flex items-center gap-3 bg-white border-2 border-purple-300 rounded-lg p-4 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">شهادة الموسم</h4>
                <p className="text-sm text-gray-600">تحميل الشهادة الرسمية</p>
              </div>
              <Download className="w-5 h-5 text-purple-600" />
            </a>
          </div>

          <div className="mt-4 bg-purple-100 border border-purple-300 rounded-lg p-3">
            <p className="text-sm text-purple-900">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              تم إكمال الموسم بنجاح! يمكنك الآن تحميل التقرير النهائي والشهادة الرسمية.
            </p>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              هذه معلومات عرض فقط. لمزيد من التفاصيل أو لطلب زيارة للمزرعة، يمكنك استخدام تبويب "الزيارات" أو "الرسوم".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
