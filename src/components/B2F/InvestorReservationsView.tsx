import { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  TreePine,
  CheckCircle,
  Clock,
  XCircle,
  Phone,
  AlertCircle,
  FileText,
  Loader2,
  ChevronLeft,
  MessageCircle,
  Copy,
  Upload,
  Building2,
  CreditCard,
  Sparkles,
  Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
// import ReceiptUploadModal from './ReceiptUploadModal'; // معطل مؤقتاً - نظام رفع الإيصال قيد التطوير

interface Reservation {
  id: string;
  farm_id: string;
  opportunity_id: string;
  investor_name: string;
  investor_phone: string;
  tree_type: string;
  number_of_trees: number;
  contract_duration_months: number;
  total_amount: number;
  status: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  payment_receipt_url?: string;
  receipt_uploaded_at?: string;
  payment_verified?: boolean;
  payment_verified_at?: string;
  // AI verification fields
  ai_verified_amount?: number;
  ai_verification_status?: string;
  ai_verification_notes?: string;
  ai_extracted_date?: string;
  expected_amount?: number;
  amount_difference?: number;
  ai_verified_at?: string;
  ai_verification_result?: any;
  // Contract & Certificate
  contract_generated?: boolean;
  contract_generated_at?: string;
  contract_pdf_url?: string;
  certificate_issued?: boolean;
  certificate_issued_at?: string;
  // Operations
  transferred_to_operations?: boolean;
  transferred_to_operations_at?: string;
  operational_status?: string;
  // من join
  opportunity_title?: string;
  farm_name?: string;
  location?: string;
  opportunity_badge?: string;
}

interface InvestorReservationsViewProps {
  investorPhone: string;
  onBack: () => void;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: {
    label: 'قيد المراجعة',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock
  },
  collection_queue: {
    label: 'في قائمة انتظار المجموعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  waiting_in_group: {
    label: 'في قائمة انتظار المجموعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  group_full_pending_payment: {
    label: 'مجموعة مكتملة - ينتظر فتح الدفع',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: CheckCircle
  },
  payment_open: {
    label: 'بانتظار رفع الإيصال',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Upload
  },
  receipt_uploaded: {
    label: 'قيد المراجعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  receipt_under_review: {
    label: 'قيد المراجعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  receipt_needs_revision: {
    label: 'إيصال مرفوض - يرجى إعادة الرفع',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  receipt_approved: {
    label: 'تم تأكيد الحجز',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  receipt_uploaded_ai_review: {
    label: 'قيد المراجعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  receipt_duplicate_financial_review: {
    label: 'قيد المراجعة',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  receipt_approved_pending_invoice: {
    label: 'تم تأكيد الحجز',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  invoice_issued: {
    label: 'تم تأكيد الحجز',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  contract_issued: {
    label: 'تم إصدار العقد',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: FileText
  },
  rejected_by_staff: {
    label: 'مرفوض من الإدارة',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  auto_approved: {
    label: 'تم الموافقة آلياً - قيد المراجعة النهائية',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  auto_rejected: {
    label: 'مرفوض آلياً - قيد المراجعة',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertCircle
  },
  receipt_rejected: {
    label: 'إيصال مرفوض - يرجى إعادة الرفع',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  financial_review: {
    label: 'قيد المراجعة المالية',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  operational: {
    label: 'قيد التشغيل',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: Sparkles
  },
  transferred_to_operations: {
    label: 'تم النقل للتشغيل',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: Sparkles
  }
};

interface BankInfo {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_iban: string;
}

export function InvestorReservationsView({ investorPhone, onBack }: InvestorReservationsViewProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (investorPhone) {
      loadReservations();
      loadBankInfo();

      // Realtime subscription for instant updates
      const subscription = supabase
        .channel('investor_reservations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'b2f_sales_requests',
            filter: `investor_phone=eq.${investorPhone}`
          },
          (payload) => {
            console.log('🔄 Realtime update:', payload);
            loadReservations();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [investorPhone]);

  const loadReservations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('b2f_sales_requests')
        .select(`
          *,
          b2f_opportunities (
            title,
            badge,
            b2f_farms (
              name,
              location
            )
          )
        `)
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((request: any) => ({
        ...request,
        opportunity_title: request.b2f_opportunities?.title || 'غير محدد',
        farm_name: request.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
        location: request.b2f_opportunities?.b2f_farms?.location || 'غير محدد',
        opportunity_badge: request.b2f_opportunities?.badge || 'none'
      }));

      setReservations(formattedData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBankInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['bank_name', 'bank_account_name', 'bank_account_number', 'bank_iban']);

      if (error) throw error;

      if (data && data.length > 0) {
        const info: any = {};
        data.forEach((item) => {
          info[item.setting_key] = item.setting_value;
        });
        setBankInfo(info as BankInfo);
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getShortId = (id: string) => {
    return id.substring(0, 8).toUpperCase();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // المسار الجديد V2 - تم نقله إلى ReceiptUploadModal و useReceiptUploadV2
  // الدالة القديمة handleReceiptUpload تم حذفها واستبدالها بنظام أفضل

  if (selectedReservation) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedReservation(null)}
              className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-white">تفاصيل الحجز</h2>
          </div>
        </div>

        {/* Details Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-16">
          {/* رقم الحجز */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-bold">رقم الحجز</span>
              <span className="text-lg font-black text-emerald-600">
                #{getShortId(selectedReservation.id)}
              </span>
            </div>
          </div>

          {/* قسم الدفع البنكي - يظهر عند payment_open */}
          {selectedReservation.status === 'payment_open' && bankInfo && (
            <div className="space-y-4">
              {/* رسالة الترحيب */}
              <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl p-5 border-2 border-emerald-300 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-emerald-500 rounded-full p-2 flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black text-emerald-900 mb-2">
                      شكراً لاختيارك إتمام الاستثمار 🌿
                    </h3>
                    <p className="text-sm text-emerald-800 leading-relaxed mb-2">
                      يمكنك الآن إتمام التحويل البنكي لإكمال الحجز والانتقال للمرحلة التالية.
                    </p>
                    <p className="text-sm text-emerald-800 leading-relaxed mb-2">
                      بعد التحويل، يرجى رفع إيصال السداد من نفس هذه الصفحة ليتم التحقق وإصدار العقد.
                    </p>
                    <p className="text-sm font-bold text-emerald-900">
                      نسعد بخدمتك دائماً ونتشرف بثقتك.
                    </p>
                  </div>
                </div>
              </div>

              {/* معلومات البنك */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 space-y-4">
                <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  معلومات التحويل البنكي
                </h3>

                {/* اسم البنك */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-bold mb-1">اسم البنك</p>
                  <p className="text-base font-bold text-gray-900">{bankInfo.bank_name}</p>
                </div>

                {/* اسم المستفيد */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs text-purple-600 font-bold mb-1">اسم المستفيد</p>
                  <p className="text-base font-bold text-gray-900">{bankInfo.bank_account_name}</p>
                </div>

                {/* رقم الحساب */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-600 font-bold">رقم الحساب</p>
                    <button
                      onClick={() => copyToClipboard(bankInfo.bank_account_number, 'account')}
                      className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-white px-2 py-1 rounded-lg border border-amber-300 hover:border-amber-400 transition-colors"
                    >
                      {copySuccess === 'account' ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-base font-black text-gray-900 tracking-wider" dir="ltr">
                    {bankInfo.bank_account_number}
                  </p>
                </div>

                {/* رقم الآيبان */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-green-600 font-bold">رقم الآيبان (IBAN)</p>
                    <button
                      onClick={() => copyToClipboard(bankInfo.bank_iban, 'iban')}
                      className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-900 bg-white px-2 py-1 rounded-lg border border-green-300 hover:border-green-400 transition-colors"
                    >
                      {copySuccess === 'iban' ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-base font-black text-gray-900 tracking-wider" dir="ltr">
                    {bankInfo.bank_iban}
                  </p>
                </div>

                {/* المبلغ المطلوب */}
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border-2 border-rose-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-rose-600" />
                      <p className="text-sm text-rose-700 font-bold">المبلغ المطلوب للسداد</p>
                    </div>
                    <p className="text-2xl font-black text-rose-600">
                      {selectedReservation.total_amount.toLocaleString()} ر.س
                    </p>
                  </div>
                </div>
              </div>

              {/* رسالة نظام رفع الإيصال قيد التطوير */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-300">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 rounded-full p-2 flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black text-amber-900 mb-2">
                      نظام رفع الإيصال قيد التحديث
                    </h3>
                    <p className="text-sm text-amber-800 leading-relaxed mb-2">
                      نعمل حالياً على تحسين نظام رفع الإيصالات لتوفير تجربة أفضل وأسرع لك.
                    </p>
                    <p className="text-sm font-bold text-amber-900">
                      سيتم تفعيل النظام الجديد قريباً. نشكر تفهمك وصبرك.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* رسالة بعد رفع الإيصال */}
          {(selectedReservation.status === 'receipt_uploaded' || selectedReservation.status === 'receipt_under_review' || selectedReservation.status === 'receipt_uploaded_ai_review') && (
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5 border-2 border-blue-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 rounded-full p-2 flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-blue-900 mb-2">
                    شكراً لك، تم استلام إيصال السداد
                  </h3>
                  <p className="text-sm text-blue-800 leading-relaxed mb-2">
                    إيصالك حالياً <span className="font-bold">قيد المراجعة</span> من قبل فريقنا للتحقق من الدفع.
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    سنقوم بإشعارك فور التحقق من الدفع وإصدار العقد. عادةً يتم ذلك خلال 24 ساعة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* رسالة بعد تأكيد الحجز */}
          {(selectedReservation.status === 'receipt_approved' || selectedReservation.status === 'receipt_approved_pending_invoice' || selectedReservation.status === 'invoice_issued' || selectedReservation.status === 'auto_approved') && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-5 border-2 border-green-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 rounded-full p-2 flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-green-900 mb-2">
                    تم تأكيد الحجز بنجاح
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed mb-2">
                    تم التحقق من الدفع وتأكيد حجزك.
                  </p>
                  <p className="text-sm text-green-800 leading-relaxed">
                    سيتم إصدار العقد قريباً وإشعارك عند جاهزيته.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* رسالة الرفض */}
          {(selectedReservation.status === 'receipt_needs_revision' || selectedReservation.status === 'rejected_by_staff' || selectedReservation.status === 'receipt_rejected' || selectedReservation.status === 'auto_rejected') && (
            <div className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl p-5 border-2 border-red-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 rounded-full p-2 flex-shrink-0">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-900 mb-2">
                    إيصال مرفوض - يرجى إعادة الرفع
                  </h3>
                  <p className="text-sm text-red-800 leading-relaxed mb-2">
                    لم نتمكن من التحقق من الإيصال المرفوع.
                  </p>
                  {selectedReservation.admin_notes && (
                    <p className="text-sm text-red-800 leading-relaxed font-bold mb-2">
                      السبب: {selectedReservation.admin_notes}
                    </p>
                  )}
                  <p className="text-sm text-red-800 leading-relaxed">
                    يرجى رفع إيصال واضح يظهر فيه المبلغ والتاريخ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* رسالة الرفض - تم إزالتها من النظام الجديد */}
          {false && (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border-2 border-red-300 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-500 rounded-full p-2 flex-shrink-0">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-red-900 mb-2">
                    تم رفض الإيصال تلقائياً
                  </h3>
                  {selectedReservation.rejection_reason && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-red-200">
                      <p className="text-sm font-bold text-red-800 mb-2">أسباب الرفض:</p>
                      <p className="text-sm text-red-700 leading-relaxed whitespace-pre-line">
                        {selectedReservation.rejection_reason}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-red-800 leading-relaxed mb-2">
                    يرجى رفع إيصال دفع حقيقي من البنك أو نظام الدفع الإلكتروني.
                  </p>
                  <p className="text-sm font-bold text-red-900">
                    تأكد من أن الإيصال يحتوي على: اسم البنك، رقم العملية، التاريخ، المبلغ الصحيح.
                  </p>
                </div>
              </div>

              {/* زر رفع إيصال جديد */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                    className="hidden"
                  />
                  <div className={`
                    bg-gradient-to-r from-emerald-500 to-green-600
                    text-white rounded-xl p-4 text-center cursor-pointer
                    hover:from-emerald-600 hover:to-green-700
                    transition-all shadow-lg hover:shadow-xl
                    ${uploadingReceipt ? 'opacity-50 cursor-not-allowed' : ''}
                  `}>
                    <div className="flex items-center justify-center gap-3">
                      {uploadingReceipt ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="text-base font-black">جاري الرفع...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span className="text-base font-black">رفع إيصال جديد صحيح</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
                <p className="text-xs text-gray-500 text-center mt-2">
                  يجب أن يكون إيصال دفع حقيقي من البنك - صورة واضحة أو PDF
                </p>
              </div>
            </div>
          )}

          {/* رسالة للإيصالات المقبولة آلياً */}
          {selectedReservation.status === 'auto_approved' && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-5 border-2 border-green-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 rounded-full p-2 flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-green-900 mb-2">
                    ✅ تم قبول الإيصال آلياً
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed mb-2">
                    نظام الذكاء الصناعي قام بفحص الإيصال والتحقق من صحته ومطابقة المبلغ.
                  </p>
                  {selectedReservation.ai_verification_notes && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-green-200">
                      <p className="text-xs text-green-600 font-bold mb-1">ملاحظات النظام الآلي:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReservation.ai_verification_notes}
                      </p>
                    </div>
                  )}
                  <p className="text-sm font-bold text-green-900">
                    طلبك الآن في قائمة المراجعة النهائية لإصدار العقد. سيتم التواصل معك قريباً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* رسالة للإيصالات المرفوضة آلياً */}
          {selectedReservation.status === 'auto_rejected' && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-orange-500 rounded-full p-2 flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-orange-900 mb-2">
                    ⚠️ يحتاج مراجعة يدوية من المالية
                  </h3>
                  <p className="text-sm text-orange-800 leading-relaxed mb-2">
                    نظام الذكاء الصناعي لاحظ بعض النقاط في الإيصال تحتاج مراجعة يدوية من فريق المالية.
                  </p>
                  {selectedReservation.rejection_reason && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-bold mb-1">الأسباب:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReservation.rejection_reason}
                      </p>
                    </div>
                  )}
                  {selectedReservation.ai_verification_notes && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-bold mb-1">ملاحظات النظام الآلي:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReservation.ai_verification_notes}
                      </p>
                    </div>
                  )}
                  <p className="text-sm font-bold text-orange-900">
                    فريق المالية سيقوم بالمراجعة خلال 24 ساعة. لا حاجة لإعادة رفع الإيصال الآن.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* رسالة المراجعة اليدوية - في النظام الجديد هذا يحدث في receipt_duplicate_financial_review */}
          {(selectedReservation.status === 'receipt_duplicate_financial_review' || selectedReservation.status === 'financial_review') && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-300 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="bg-orange-500 rounded-full p-2 flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-orange-900 mb-2">
                    يحتاج مراجعة يدوية من الإدارة
                  </h3>
                  <p className="text-sm text-orange-800 leading-relaxed mb-2">
                    تم استلام إيصالك، لكن النظام لاحظ بعض النقاط التي تحتاج مراجعة يدوية من فريقنا.
                  </p>
                  {selectedReservation.ai_verification_notes && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
                      <p className="text-xs text-orange-600 font-bold mb-1">ملاحظات التحليل:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReservation.ai_verification_notes}
                      </p>
                    </div>
                  )}
                  <p className="text-sm font-bold text-orange-900">
                    سيتم مراجعة إيصالك خلال 24 ساعة وإشعارك بالنتيجة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* الحالة */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3">الحالة الحالية</h3>
            {(() => {
              const statusInfo = statusMap[selectedReservation.status] || {
                label: selectedReservation.status,
                color: 'bg-gray-100 text-gray-800',
                icon: AlertCircle
              };
              const StatusIcon = statusInfo.icon;

              return (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${statusInfo.color}`}>
                  <StatusIcon className="w-5 h-5" />
                  <span className="font-bold">{statusInfo.label}</span>
                </div>
              );
            })()}
          </div>

          {/* تفاصيل العرض */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3">تفاصيل العرض</h3>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">اسم العرض</p>
                <p className="font-bold text-gray-900">{selectedReservation.opportunity_title}</p>
              </div>
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex items-start gap-3">
              <TreePine className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">نوع الأشجار</p>
                <p className="font-bold text-gray-900">{selectedReservation.tree_type}</p>
              </div>
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">عدد الأشجار المحجوزة</p>
                <p className="font-bold text-gray-900">{selectedReservation.number_of_trees} شجرة</p>
              </div>
            </div>
          </div>

          {/* المبلغ الإجمالي */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 font-bold">المبلغ الإجمالي</span>
              <span className="text-2xl font-black text-amber-600">
                {selectedReservation.total_amount.toLocaleString()} ر.س
              </span>
            </div>
          </div>

          {/* معلومات الاتصال */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3">معلومات التواصل</h3>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">رقم الهاتف</p>
                <p className="font-bold text-gray-900" dir="ltr">{selectedReservation.investor_phone}</p>
              </div>
            </div>
          </div>

          {/* التواريخ */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3">التواريخ</h3>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">تاريخ إنشاء الحجز</p>
                <p className="font-bold text-gray-900">{formatDate(selectedReservation.created_at)}</p>
              </div>
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">آخر تحديث</p>
                <p className="font-bold text-gray-900">{formatDate(selectedReservation.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* الملاحظات */}
          {(selectedReservation.notes || selectedReservation.admin_notes) && (
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-gray-700 mb-3">الملاحظات</h3>

              {selectedReservation.notes && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-600 font-bold mb-1">ملاحظاتك</p>
                  <p className="text-sm text-gray-700">{selectedReservation.notes}</p>
                </div>
              )}

              {selectedReservation.admin_notes && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-amber-600 font-bold mb-1">ملاحظات الإدارة</p>
                  <p className="text-sm text-gray-700">{selectedReservation.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* نتيجة تحليل الذكاء الصناعي */}
          {selectedReservation.ai_verification_status && selectedReservation.ai_verification_status !== 'pending' && (
            <div className={`rounded-xl p-4 border-2 ${
              selectedReservation.ai_verification_status === 'verified'
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                : selectedReservation.ai_verification_status === 'mismatch'
                ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <Sparkles className={`w-6 h-6 flex-shrink-0 ${
                  selectedReservation.ai_verification_status === 'verified'
                    ? 'text-green-600'
                    : selectedReservation.ai_verification_status === 'mismatch'
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`} />
                <div className="flex-1">
                  <p className={`font-black mb-1 ${
                    selectedReservation.ai_verification_status === 'verified'
                      ? 'text-green-900'
                      : selectedReservation.ai_verification_status === 'mismatch'
                      ? 'text-orange-900'
                      : 'text-red-900'
                  }`}>
                    {selectedReservation.ai_verification_status === 'verified'
                      ? '✅ تم التحقق من الإيصال بنجاح'
                      : selectedReservation.ai_verification_status === 'mismatch'
                      ? '⚠️ يوجد فرق بسيط في المبلغ'
                      : '❌ يحتاج مراجعة يدوية'
                    }
                  </p>

                  {selectedReservation.ai_verification_notes && (
                    <p className={`text-sm mb-3 ${
                      selectedReservation.ai_verification_status === 'verified'
                        ? 'text-green-700'
                        : selectedReservation.ai_verification_status === 'mismatch'
                        ? 'text-orange-700'
                        : 'text-red-700'
                    }`}>
                      {selectedReservation.ai_verification_notes}
                    </p>
                  )}

                  {/* تفاصيل المبالغ */}
                  {selectedReservation.ai_verified_amount && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">المبلغ المتوقع:</span>
                        <span className="font-bold text-gray-900">
                          {selectedReservation.expected_amount?.toLocaleString()} ر.س
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">المبلغ المكتشف:</span>
                        <span className="font-bold text-gray-900">
                          {selectedReservation.ai_verified_amount.toLocaleString()} ر.س
                        </span>
                      </div>
                      {selectedReservation.amount_difference !== undefined && selectedReservation.amount_difference !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">الفرق:</span>
                          <span className={`font-bold ${
                            Math.abs(selectedReservation.amount_difference) <= 10
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }`}>
                            {selectedReservation.amount_difference > 0 ? '+' : ''}
                            {selectedReservation.amount_difference.toLocaleString()} ر.س
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* حالة الدفع */}
          {selectedReservation.payment_verified && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="font-black text-green-900">تم التحقق من الدفع</p>
              </div>
              <p className="text-sm text-green-700">
                تم التحقق من سدادك بنجاح. سنتواصل معك لإتمام الإجراءات.
              </p>
              {selectedReservation.payment_verified_at && (
                <p className="text-xs text-green-600 mt-2">
                  تاريخ التحقق: {formatDate(selectedReservation.payment_verified_at)}
                </p>
              )}
            </div>
          )}

          {/* حالة العقد */}
          {selectedReservation.contract_generated && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <p className="font-black text-blue-900">تم إصدار العقد</p>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                عقدك جاهز للتحميل
              </p>
              {selectedReservation.contract_pdf_url && (
                <a
                  href={selectedReservation.contract_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  تحميل العقد
                </a>
              )}
            </div>
          )}

          {/* حالة الشهادة */}
          {selectedReservation.certificate_issued && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-amber-600" />
                <p className="font-black text-amber-900">تم إصدار الشهادة</p>
              </div>
              <p className="text-sm text-amber-700">
                شهادة استثمارك جاهزة
              </p>
            </div>
          )}

          {/* حالة التشغيل */}
          {selectedReservation.transferred_to_operations && (
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border-2 border-teal-200">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-teal-600" />
                <p className="font-black text-teal-900">تم النقل للتشغيل</p>
              </div>
              <p className="text-sm text-teal-700">
                استثمارك الآن في مرحلة التشغيل والمتابعة
              </p>
              {selectedReservation.operational_status && (
                <p className="text-xs text-teal-600 mt-2">
                  الحالة التشغيلية: {selectedReservation.operational_status === 'in_progress' ? 'قيد التشغيل' : selectedReservation.operational_status}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
            <p className="text-gray-600 text-sm">جاري تحميل الحجوزات...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد حجوزات</h3>
            <p className="text-sm text-gray-600 mb-4 max-w-sm">
              لم تقم بأي حجوزات بعد. استكشف الفرص الاستثمارية المتاحة وابدأ رحلتك الاستثمارية!
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-16">
            {/* عدد الحجوزات */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                لديك <span className="font-bold text-emerald-600">{reservations.length}</span> حجز
              </p>
            </div>

            {/* تنبيه الإجراءات الجديدة */}
            {(() => {
              const actionableReservations = reservations.filter(r =>
                ['payment_open', 'receipt_approved_pending_invoice', 'invoice_issued', 'contract_issued'].includes(r.status)
              );

              if (actionableReservations.length === 0) return null;

              return (
                <div className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl p-4 border-2 border-red-300 shadow-lg mb-4 animate-pulse-slow">
                  <div className="flex items-start gap-3">
                    <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-full p-2 flex-shrink-0">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-red-900 mb-2 flex items-center gap-2">
                        لديك إجراء جديد من الإدارة
                        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] bg-red-600 text-white text-xs font-black rounded-full px-2">
                          {actionableReservations.length}
                        </span>
                      </h3>
                      <p className="text-sm text-red-800 leading-relaxed mb-2">
                        {actionableReservations.some(r => r.status === 'payment_open') && (
                          <>تم فتح الدفع لبعض طلباتك. يمكنك الآن رفع إيصال التحويل البنكي.</>
                        )}
                        {!actionableReservations.some(r => r.status === 'payment_open') && (
                          <>لديك تحديثات جديدة على طلباتك تحتاج منك إجراء.</>
                        )}
                      </p>
                      <p className="text-sm font-bold text-red-900">
                        انقر على الطلب أدناه لمشاهدة التفاصيل واستكمال الإجراء المطلوب
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {reservations.map((reservation) => {
              const statusInfo = statusMap[reservation.status] || {
                label: reservation.status,
                color: 'bg-gray-100 text-gray-800',
                icon: AlertCircle
              };
              const StatusIcon = statusInfo.icon;
              const needsAction = ['payment_open', 'receipt_approved_pending_invoice', 'invoice_issued', 'contract_issued'].includes(reservation.status);

              return (
                <button
                  key={reservation.id}
                  onClick={() => setSelectedReservation(reservation)}
                  className={`w-full bg-white rounded-xl p-4 border-2 transition-all shadow-sm hover:shadow-md text-right relative ${
                    needsAction
                      ? 'border-red-400 hover:border-red-500 ring-2 ring-red-200 animate-pulse-slow'
                      : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  {needsAction && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                      <Bell className="w-3 h-3" />
                      <span>جديد</span>
                    </div>
                  )}
                  {/* رأس البطاقة */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500">
                      #{getShortId(reservation.id)}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  {/* اسم العرض */}
                  <h3 className="font-black text-gray-900 mb-2 text-sm">
                    {reservation.opportunity_title}
                  </h3>

                  {/* التفاصيل */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-600">{reservation.tree_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-gray-600">{reservation.number_of_trees} شجرة</span>
                    </div>
                  </div>

                  {/* المبلغ والتاريخ */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm font-black text-emerald-600">
                      {reservation.total_amount.toLocaleString()} ر.س
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(reservation.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal رفع الإيصال - المسار الجديد V2 */}
      {/* Modal رفع الإيصال - معطل مؤقتاً */}
      {/* {showReceiptModal && selectedReservation && (
        <ReceiptUploadModal
          requestId={selectedReservation.id}
          expectedAmount={selectedReservation.total_amount}
          investorName={selectedReservation.investor_name}
          onClose={() => setShowReceiptModal(false)}
          onSuccess={() => {
            loadReservations();
            setShowReceiptModal(false);
          }}
        />
      )} */}
    </div>
  );
}
