import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  User,
  Phone,
  Briefcase,
  Building,
  Shield,
  QrCode,
  Key,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  MessageSquare,
  Clock,
  Star,
  Users,
  Settings,
  Target,
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

interface FormData {
  full_name: string;
  phone_number: string;
  job_title: string;
  department: 'hq' | 'b2b' | 'b2f' | '';
  reports_to: string;
  permission_template: string;
  can_create_tasks: boolean;
  can_approve_tasks: boolean;
  can_send_reports: boolean;
  enable_qr: boolean;
  requires_pin: boolean;
  pin_code: string;
  session_duration: number;
}

interface StaffCard {
  id: string;
  staff_code: string;
  full_name: string;
  job_title: string;
  department: string;
  qr_code: string;
  pin_code: string;
}

const PERMISSION_TEMPLATES = [
  {
    value: 'super_admin',
    label: 'مدير عام',
    description: 'صلاحية مطلقة على كامل النظام',
    icon: Star,
    color: 'from-amber-500 to-orange-600'
  },
  {
    value: 'department_manager',
    label: 'مدير قسم',
    description: 'إدارة القسم والموظفين',
    icon: Users,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    value: 'admin_staff',
    label: 'موظف إداري',
    description: 'صلاحيات إدارية محدودة',
    icon: Briefcase,
    color: 'from-slate-500 to-gray-600'
  },
  {
    value: 'farm_manager',
    label: 'مدير مزرعة',
    description: 'إدارة المزارع والعمليات',
    icon: Target,
    color: 'from-green-500 to-emerald-600'
  },
  {
    value: 'operations_supervisor',
    label: 'مشرف تشغيلي',
    description: 'إشراف على العمليات الميدانية',
    icon: Settings,
    color: 'from-violet-500 to-purple-600'
  },
  {
    value: 'investor_service',
    label: 'خدمة مستثمر',
    description: 'متابعة المستثمرين والطلبات',
    icon: Award,
    color: 'from-rose-500 to-pink-600'
  },
  {
    value: 'finance2',
    label: 'مالية 2',
    description: 'مراجعة واعتماد المدفوعات',
    icon: Sparkles,
    color: 'from-teal-500 to-cyan-600'
  }
];

export default function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [staffCard, setStaffCard] = useState<StaffCard | null>(null);

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone_number: '+966',
    job_title: '',
    department: '',
    reports_to: '',
    permission_template: 'admin_staff',
    can_create_tasks: false,
    can_approve_tasks: false,
    can_send_reports: false,
    enable_qr: true,
    requires_pin: true,
    pin_code: '',
    session_duration: 30
  });

  const generatePIN = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin_code: pin });
  };

  const generateQRToken = () => {
    return `STAFF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  };

  const generateStaffCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_new_staff_code');

      if (error) {
        console.error('❌ Error calling get_new_staff_code:', error);
        throw error;
      }

      if (!data) {
        throw new Error('لم يتم إرجاع رقم موظف من قاعدة البيانات');
      }

      console.log(`✅ Generated unique staff code from DB: ${data}`);
      return data as string;
    } catch (error) {
      console.error('❌ Fatal error generating staff code:', error);
      throw new Error('فشل توليد رقم موظف فريد');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.full_name || !formData.phone_number || !formData.job_title) {
        alert('يرجى تعبئة جميع الحقول الإلزامية');
        return;
      }
      if (!formData.phone_number.startsWith('+966')) {
        alert('رقم الجوال يجب أن يبدأ بـ +966');
        return;
      }
    }

    if (step < 3) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.phone_number) {
      alert('يرجى تعبئة جميع الحقول الإلزامية');
      return;
    }

    setLoading(true);
    const { data: existing } = await supabase
      .from('platform_staff')
      .select('id')
      .eq('phone_number', formData.phone_number)
      .maybeSingle();

    if (existing) {
      alert('رقم الجوال مسجل مسبقاً لموظف آخر');
      setLoading(false);
      return;
    }

    const qrToken = formData.enable_qr ? generateQRToken() : null;
    const pinCode = formData.requires_pin && formData.pin_code ? formData.pin_code : null;

    try {
      console.log('📝 Creating staff member with auto-generated code...');

      const { data: staffData, error: staffError } = await supabase
        .from('platform_staff')
        .insert({
          phone_number: formData.phone_number,
          full_name: formData.full_name,
          role: formData.permission_template,
          department: formData.department,
          job_title: formData.job_title,
          reports_to: formData.reports_to || null,
          qr_code: qrToken,
          requires_pin: formData.requires_pin,
          pin_code: pinCode,
          is_active: true
        })
        .select()
        .single();

      if (staffError) {
        throw staffError;
      }

      if (staffData && typeof staffData === 'object' && 'id' in staffData) {
        console.log(`✅ Staff member created successfully with ID: ${staffData.id}`);
        console.log(`✅ Auto-generated staff code: ${(staffData as any).staff_code}`);

        await supabase.from('staff_permissions').insert({
          staff_id: staffData.id as string,
          permission_template: formData.permission_template,
          can_create_tasks: formData.can_create_tasks,
          can_approve_tasks: formData.can_approve_tasks,
          can_send_reports: formData.can_send_reports
        });

        await supabase.from('platform_audit_logs').insert({
          action_type: 'staff_created',
          target_type: 'staff',
          target_id: staffData.id as string,
          details: {
            staff_name: formData.full_name,
            department: formData.department,
            role: formData.permission_template
          }
        });

        setStaffCard({
          id: staffData.id as string,
          staff_code: (staffData as any).staff_code || 'N/A',
          full_name: formData.full_name,
          job_title: formData.job_title,
          department: formData.department,
          qr_code: qrToken || '',
          pin_code: pinCode || ''
        });

        setStep(3 as Step);
        setLoading(false);
      }
    } catch (error: any) {
      // طباعة الخطأ بالكامل للمستخدم
      console.error('❌ ============ ERROR DETAILS START ============');
      console.error('Error Type:', typeof error);
      console.error('Error Object:', error);
      console.error('Error Code:', error?.code);
      console.error('Error Message:', error?.message);
      console.error('Error Details:', error?.details);
      console.error('Error Hint:', error?.hint);
      console.error('Full Error JSON:', JSON.stringify(error, null, 2));
      console.error('❌ ============ ERROR DETAILS END ============');

      let errorMessage = 'فشل إضافة الموظف';

      if (error.code === '23505') {
        errorMessage = 'رقم الموظف مكرر. يرجى المحاولة مرة أخرى.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
      setLoading(false);
    }
  };

  const copyWhatsAppMessage = () => {
    if (!staffCard) return;

    const message = `مرحباً ${staffCard.full_name}،\n\nتم إضافتك كموظف في المنصة\n\nالرقم الإداري: ${staffCard.staff_code}\nالمسمى: ${staffCard.job_title}\nالقسم: ${getDepartmentLabel(staffCard.department)}\n\n${staffCard.pin_code ? `رمز PIN: ${staffCard.pin_code}\n` : ''}يرجى الاحتفاظ ببطاقة الدخول الخاصة بك.`;

    navigator.clipboard.writeText(message);
    alert('تم نسخ الرسالة');
  };

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      hq: 'الإدارة العليا',
      b2b: 'مزاد الشركات',
      b2f: 'استثمار أشجار المزارع'
    };
    return labels[dept] || dept;
  };

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      hq: 'from-amber-500 to-orange-600',
      b2b: 'from-blue-500 to-cyan-600',
      b2f: 'from-green-500 to-emerald-600'
    };
    return colors[dept] || 'from-slate-500 to-gray-600';
  };

  const handleClose = () => {
    setStep(1);
    setStaffCard(null);
    setFormData({
      full_name: '',
      phone_number: '+966',
      job_title: '',
      department: '',
      reports_to: '',
      permission_template: 'admin_staff',
      can_create_tasks: false,
      can_approve_tasks: false,
      can_send_reports: false,
      enable_qr: true,
      requires_pin: true,
      pin_code: '',
      session_duration: 30
    });
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl w-full max-w-5xl border border-emerald-500/20 shadow-2xl shadow-emerald-500/10 my-8 animate-in fade-in duration-300">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-8 py-6 flex items-center justify-between rounded-t-3xl border-b border-emerald-400/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">إضافة موظف جديد</h2>
              <p className="text-emerald-100 text-sm">بناء فريق العمل المتميز</p>
            </div>
          </div>
          <button
            onClick={staffCard ? handleClose : onClose}
            className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 group"
          >
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Progress Bar - Only show if not on card view */}
        {!staffCard && (
          <div className="relative px-8 py-6 bg-slate-800/50 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-emerald-400">الخطوة {step} من 3</span>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>
                  {step === 1 ? 'البيانات الأساسية' : step === 2 ? 'الصلاحيات والأدوار' : 'بطاقة الدخول'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`relative flex-1 h-3 rounded-full overflow-hidden transition-all duration-500 ${
                    s <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-white/5'
                  }`}
                >
                  {s <= step && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative p-8 min-h-[500px]">
          {/* Step 1: بيانات الموظف */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">البيانات الأساسية</h3>
                  <p className="text-sm text-gray-400">أدخل معلومات الموظف الشخصية</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    الاسم الكامل
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="مثال: أحمد محمد العلي"
                      className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-teal-500/0 group-focus-within:from-emerald-500/10 group-focus-within:to-teal-500/10 pointer-events-none transition-all duration-300"></div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    رقم الجوال
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+966xxxxxxxxx"
                      className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-teal-500/0 group-focus-within:from-emerald-500/10 group-focus-within:to-teal-500/10 pointer-events-none transition-all duration-300"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    يبدأ بـ +966 (منع التكرار)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    المسمى الوظيفي
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      placeholder="مثال: مدير عمليات، مشرف مبيعات"
                      className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-teal-500/0 group-focus-within:from-emerald-500/10 group-focus-within:to-teal-500/10 pointer-events-none transition-all duration-300"></div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    القسم
                    <span className="text-gray-500 text-xs">(اختياري)</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">اختر القسم</option>
                    <option value="hq" className="bg-slate-900">الإدارة العليا (HQ)</option>
                    <option value="b2b" className="bg-slate-900">مزاد الشركات (B2B)</option>
                    <option value="b2f" className="bg-slate-900">استثمار أشجار المزارع (B2F)</option>
                  </select>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  المدير المباشر (يتبع لـ)
                  <span className="text-gray-500 text-xs">(اختياري)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.reports_to}
                    onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                    placeholder="اسم المدير المباشر"
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-teal-500/0 group-focus-within:from-emerald-500/10 group-focus-within:to-teal-500/10 pointer-events-none transition-all duration-300"></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: الصلاحيات */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">الصلاحيات والأدوار</h3>
                  <p className="text-sm text-gray-400">حدد دور الموظف والصلاحيات المتاحة</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSION_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, permission_template: template.value })}
                      className={`relative p-5 rounded-2xl border-2 text-right transition-all duration-300 group overflow-hidden ${
                        formData.permission_template === template.value
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="relative z-10 flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-bold mb-1 text-lg">{template.label}</h4>
                          <p className="text-sm text-gray-400 leading-relaxed">{template.description}</p>
                        </div>
                        {formData.permission_template === template.value && (
                          <CheckCircle className="w-6 h-6 text-emerald-400 animate-in zoom-in duration-200" />
                        )}
                      </div>
                      {formData.permission_template === template.value && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-5">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-white font-bold text-lg">صلاحيات إضافية</h4>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={formData.can_create_tasks}
                      onChange={(e) => setFormData({ ...formData, can_create_tasks: e.target.checked })}
                      className="w-6 h-6 rounded-lg border-white/20 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">إنشاء المهام</span>
                      <p className="text-xs text-gray-500 mt-0.5">السماح بإنشاء مهام جديدة للفريق</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </label>

                  <label className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={formData.can_approve_tasks}
                      onChange={(e) => setFormData({ ...formData, can_approve_tasks: e.target.checked })}
                      className="w-6 h-6 rounded-lg border-white/20 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">اعتماد المهام</span>
                      <p className="text-xs text-gray-500 mt-0.5">مراجعة واعتماد المهام والإثباتات</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </label>

                  <label className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200 group">
                    <input
                      type="checkbox"
                      checked={formData.can_send_reports}
                      onChange={(e) => setFormData({ ...formData, can_send_reports: e.target.checked })}
                      className="w-6 h-6 rounded-lg border-white/20 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">إرسال التقارير</span>
                      <p className="text-xs text-gray-500 mt-0.5">رفع التقارير للإدارة العليا</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: بطاقة الدخول */}
          {step === 3 && !staffCard && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">بطاقة الدخول والأمان</h3>
                  <p className="text-sm text-gray-400">إعدادات الوصول والمصادقة</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl p-6 group hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_qr}
                    onChange={(e) => setFormData({ ...formData, enable_qr: e.target.checked })}
                    className="w-6 h-6 mt-1 rounded-lg border-emerald-500/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-bold mb-2">
                      <QrCode className="w-6 h-6 text-emerald-400" />
                      <span>تفعيل الدخول بالباركود</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">موصى به</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      يمكن للموظف المسح الضوئي للباركود للدخول السريع والآمن
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-6 border border-white/10 group hover:border-white/20 transition-all duration-300">
                <label className="flex items-start gap-4 cursor-pointer mb-5">
                  <input
                    type="checkbox"
                    checked={formData.requires_pin}
                    onChange={(e) => setFormData({ ...formData, requires_pin: e.target.checked })}
                    className="w-6 h-6 mt-1 rounded-lg border-white/20 text-emerald-500 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-bold mb-2">
                      <Key className="w-6 h-6 text-emerald-400" />
                      <span>يتطلب رمز PIN</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      طبقة أمان إضافية للمدراء والمشرفين (4 أرقام)
                    </p>
                  </div>
                </label>

                {formData.requires_pin && (
                  <div className="animate-in slide-in-from-top duration-300">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={formData.pin_code}
                        onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.slice(0, 4) })}
                        placeholder="• • • •"
                        maxLength={4}
                        className="flex-1 px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white text-center text-3xl font-bold tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={generatePIN}
                        className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2 group"
                      >
                        <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        توليد تلقائي
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-white font-bold text-lg">جلسة العمل</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10">
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300">تسجيل الخروج اليدوي</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10">
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300">انتهاء تلقائي بعد 30 دقيقة من عدم النشاط</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Staff Card Preview */}
          {staffCard && (
            <div className="space-y-6 animate-in zoom-in duration-500">
              <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-3xl p-10 border-4 border-emerald-500 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.1),transparent_50%)]"></div>

                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <div className="relative inline-block mb-6">
                      <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${getDepartmentColor(staffCard.department)} flex items-center justify-center shadow-2xl`}>
                        <User className="w-14 h-14 text-white" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center border-4 border-white shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{staffCard.full_name}</h3>
                    <p className="text-gray-600 font-medium text-lg mb-3">{staffCard.job_title}</p>
                    <span className={`inline-block px-5 py-2 bg-gradient-to-r ${getDepartmentColor(staffCard.department)} text-white rounded-full text-sm font-bold shadow-lg`}>
                      {getDepartmentLabel(staffCard.department)}
                    </span>
                  </div>

                  {staffCard.qr_code && (
                    <div className="bg-white rounded-2xl p-8 mb-6 border-2 border-gray-200 shadow-xl">
                      <div className="w-56 h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                        <QrCode className="w-32 h-32 text-gray-400" />
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-5 font-mono bg-gray-100 px-4 py-2 rounded-xl">
                        {staffCard.qr_code}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 text-center border border-slate-200 shadow-lg">
                      <p className="text-xs text-slate-500 mb-2 font-medium">الرقم الإداري</p>
                      <p className="text-2xl font-bold text-slate-900">{staffCard.staff_code}</p>
                    </div>

                    {staffCard.pin_code && (
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 text-center border-2 border-emerald-300 shadow-lg">
                        <p className="text-xs text-emerald-600 mb-2 font-medium flex items-center justify-center gap-1">
                          <Key className="w-3 h-3" />
                          رمز PIN
                        </p>
                        <p className="text-2xl font-bold text-emerald-900 tracking-[0.3em]">{staffCard.pin_code}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 text-center border-2 border-emerald-200 shadow-lg">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                    <p className="text-emerald-900 font-bold text-lg">تم إنشاء الموظف بنجاح</p>
                    <p className="text-emerald-600 text-sm mt-1">جاهز للعمل على المنصة</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-3 group"
                >
                  <Download className="w-5 h-5 group-hover:animate-bounce" />
                  طباعة البطاقة
                </button>

                <button
                  type="button"
                  onClick={copyWhatsAppMessage}
                  className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-3 group"
                >
                  <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  نسخ رسالة واتساب
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 flex items-center justify-center gap-2 group"
              >
                <CheckCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                إنهاء وإغلاق
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions - Only show if not on card view */}
        {!staffCard && (
          <div className="relative px-8 py-6 bg-slate-800/50 backdrop-blur-sm flex gap-4 rounded-b-3xl border-t border-white/10">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all duration-200 flex items-center gap-2 disabled:opacity-50 border border-white/10 hover:border-white/20 group"
              >
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                السابق
              </button>
            )}

            <button
              type="button"
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={loading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 flex items-center justify-center gap-2 disabled:opacity-50 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    جاري الإنشاء...
                  </>
                ) : step === 3 ? (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    إنشاء الموظف
                  </>
                ) : (
                  <>
                    التالي
                    <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
