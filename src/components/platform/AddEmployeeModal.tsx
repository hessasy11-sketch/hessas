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
  Clock
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
  { value: 'super_admin', label: 'مدير عام', description: 'صلاحية مطلقة على كامل النظام' },
  { value: 'department_manager', label: 'مدير قسم', description: 'إدارة القسم والموظفين' },
  { value: 'admin_staff', label: 'موظف إداري', description: 'صلاحيات إدارية محدودة' },
  { value: 'farm_manager', label: 'مدير مزرعة', description: 'إدارة المزارع والعمليات' },
  { value: 'operations_supervisor', label: 'مشرف تشغيلي', description: 'إشراف على العمليات الميدانية' },
  { value: 'investor_service', label: 'خدمة مستثمر', description: 'متابعة المستثمرين والطلبات' },
  { value: 'finance2', label: 'مالية 2', description: 'مراجعة واعتماد المدفوعات' }
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

  const generateStaffCode = async () => {
    const { count } = await supabase
      .from('platform_staff')
      .select('id', { count: 'exact', head: true });

    return `A-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.full_name || !formData.phone_number || !formData.job_title || !formData.department) {
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
    if (!formData.full_name || !formData.phone_number || !formData.department) {
      alert('يرجى تعبئة جميع الحقول الإلزامية');
      return;
    }

    setLoading(true);
    try {
      // التحقق من عدم تكرار رقم الجوال
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

      // توليد QR Token و Staff Code
      const qrToken = formData.enable_qr ? generateQRToken() : null;
      const staffCode = await generateStaffCode();
      const pinCode = formData.requires_pin && formData.pin_code ? formData.pin_code : null;

      // إنشاء الموظف
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
          is_active: true,
          staff_code: staffCode
        })
        .select()
        .single();

      if (staffError) throw staffError;

      // إنشاء الصلاحيات
      if (staffData && typeof staffData === 'object' && 'id' in staffData) {
        await supabase.from('staff_permissions').insert({
          staff_id: staffData.id as string,
          permission_template: formData.permission_template,
          can_create_tasks: formData.can_create_tasks,
          can_approve_tasks: formData.can_approve_tasks,
          can_send_reports: formData.can_send_reports
        });

        // تسجيل في Audit Log
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

        // إعداد بطاقة الموظف
        setStaffCard({
          id: staffData.id as string,
          staff_code: staffCode,
          full_name: formData.full_name,
          job_title: formData.job_title,
          department: formData.department,
          qr_code: qrToken || '',
          pin_code: pinCode || ''
        });

        setStep(3 as Step);
      }
    } catch (error: any) {
      console.error('Error creating staff:', error);
      alert(error.message || 'فشل إضافة الموظف');
    } finally {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl w-full max-w-4xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">إضافة موظف جديد</h2>
          <button
            onClick={staffCard ? handleClose : onClose}
            className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Bar - Only show if not on card view */}
        {!staffCard && (
          <div className="px-6 py-4 bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-300">الخطوة {step} من 3</span>
              <span className="text-sm text-gray-400">
                {step === 1 ? 'البيانات' : step === 2 ? 'الصلاحية' : 'بطاقة الدخول'}
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    s <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Step 1: بيانات الموظف */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="مثال: أحمد محمد العلي"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الجوال *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+966xxxxxxxxx"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">يبدأ بـ +966 (منع التكرار)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    المسمى الوظيفي *
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="مثال: مدير عمليات، مشرف مبيعات"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    القسم *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">اختر القسم</option>
                    <option value="hq">الإدارة العليا (HQ)</option>
                    <option value="b2b">مزاد الشركات (B2B)</option>
                    <option value="b2f">استثمار أشجار المزارع (B2F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">المدير المباشر (يتبع لـ)</label>
                <input
                  type="text"
                  value={formData.reports_to}
                  onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                  placeholder="اختياري"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: الصلاحيات */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  اختيار قالب صلاحية جاهز
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PERMISSION_TEMPLATES.map((template) => (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, permission_template: template.value })}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        formData.permission_template === template.value
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <h4 className="text-white font-bold mb-1">{template.label}</h4>
                      <p className="text-xs text-gray-400">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-bold mb-3">مفاتيح تخصيص إضافية</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_create_tasks}
                      onChange={(e) => setFormData({ ...formData, can_create_tasks: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300">إنشاء مهام</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_approve_tasks}
                      onChange={(e) => setFormData({ ...formData, can_approve_tasks: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300">اعتماد مهام/إثباتات</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_send_reports}
                      onChange={(e) => setFormData({ ...formData, can_send_reports: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300">إرسال تقارير للإدارة العليا</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: بطاقة الدخول */}
          {step === 3 && !staffCard && (
            <div className="space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_qr}
                    onChange={(e) => setFormData({ ...formData, enable_qr: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-bold mb-1">
                      <QrCode className="w-5 h-5" />
                      تفعيل الدخول بالباركود
                    </div>
                    <p className="text-sm text-gray-300">افتراضي: مفعّل</p>
                  </div>
                </label>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={formData.requires_pin}
                    onChange={(e) => setFormData({ ...formData, requires_pin: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-bold mb-1">
                      <Key className="w-5 h-5" />
                      يتطلب PIN
                    </div>
                    <p className="text-sm text-gray-400">للمدراء والمشرفين (4 أرقام)</p>
                  </div>
                </label>

                {formData.requires_pin && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.slice(0, 4) })}
                      placeholder="0000"
                      maxLength={4}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={generatePIN}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all"
                    >
                      توليد تلقائي
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white font-bold mb-3">
                  <Clock className="w-5 h-5" />
                  جلسة الإدارة
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  تبقى فعالة ولا تنتهي إلا بـ:
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    تسجيل الخروج يدوياً
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    أو 30 دقيقة من عدم النشاط (Idle)
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Staff Card Preview */}
          {staffCard && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white to-gray-100 rounded-2xl p-8 border-4 border-emerald-500 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{staffCard.full_name}</h3>
                  <p className="text-gray-600 font-medium mb-2">{staffCard.job_title}</p>
                  <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">
                    {getDepartmentLabel(staffCard.department)}
                  </span>
                </div>

                {staffCard.qr_code && (
                  <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                    <div className="w-48 h-48 bg-gray-200 rounded-xl mx-auto flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-gray-400" />
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-4 font-mono">
                      {staffCard.qr_code}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">الرقم الإداري</p>
                    <p className="text-lg font-bold text-gray-900">{staffCard.staff_code}</p>
                  </div>

                  {staffCard.pin_code && (
                    <div className="bg-emerald-50 rounded-xl p-4 text-center border-2 border-emerald-200">
                      <p className="text-xs text-emerald-600 mb-1">رمز PIN</p>
                      <p className="text-lg font-bold text-emerald-900 tracking-widest">{staffCard.pin_code}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">تم إنشاء الموظف بنجاح</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  طباعة البطاقة
                </button>

                <button
                  type="button"
                  onClick={copyWhatsAppMessage}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  نسخ رسالة واتساب
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions - Only show if not on card view */}
        {!staffCard && (
          <div className="px-6 py-4 bg-slate-800/50 flex gap-3 sticky bottom-0 rounded-b-2xl">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowRight className="w-5 h-5" />
                السابق
              </button>
            )}

            <button
              type="button"
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'جاري الإنشاء...'
              ) : step === 3 ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  إنشاء الموظف
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
