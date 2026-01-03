import { useState, useEffect } from 'react';
import { DollarSign, Upload, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvestorOperationFeesViewProps {
  investorPhone: string;
}

export function InvestorOperationFeesView({ investorPhone }: InvestorOperationFeesViewProps) {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFeeId, setUploadingFeeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentFee, setCurrentFee] = useState<any>(null);

  useEffect(() => {
    loadFees();
  }, [investorPhone]);

  const loadFees = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('investor_operation_fees')
        .select(`
          *,
          season_fee_id (
            season_id (
              season_name,
              season_year,
              farm_id (
                name
              )
            )
          )
        `)
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFees(data || []);
    } catch (error) {
      console.error('Error loading fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadReceipt = async () => {
    if (!selectedFile || !currentFee) return;

    try {
      setUploadingFeeId(currentFee.id);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${currentFee.id}_${Date.now()}.${fileExt}`;
      const filePath = `${investorPhone}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('operation-fee-receipts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('operation-fee-receipts')
        .getPublicUrl(filePath);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-operation-fee-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feeId: currentFee.id,
          receiptUrl: publicUrl,
          expectedAmount: currentFee.fee_amount,
          investorPhone: investorPhone
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setShowUploadModal(false);
        setSelectedFile(null);
        setCurrentFee(null);
        loadFees();
      } else {
        throw new Error(result.error || 'فشل التحقق من الإيصال');
      }
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      alert('حدث خطأ أثناء رفع الإيصال: ' + error.message);
    } finally {
      setUploadingFeeId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      not_sent: { text: 'لم يتم الإرسال', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
      pending_payment: { text: 'في انتظار السداد', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      under_review: { text: 'قيد المراجعة', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
      paid: { text: 'مدفوع', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      late: { text: 'متأخر', color: 'bg-red-100 text-red-700', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.not_sent;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
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

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">رسوم التشغيل</h2>
        </div>
        <p className="text-gray-700">
          هنا يمكنك عرض ودفع رسوم التشغيل الخاصة بمواسم مزارعك
        </p>
      </div>

      {fees.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد رسوم تشغيلية</h3>
          <p className="text-gray-600">
            لم يتم إنشاء رسوم تشغيلية لمواسمك بعد
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {fee.season_fee_id?.season_id?.farm_id?.name || 'مزرعة'}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {fee.season_fee_id?.season_id?.season_name || 'موسم'} - {fee.season_fee_id?.season_id?.season_year || ''}
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-600">قيمة الرسوم</p>
                      <p className="text-2xl font-bold text-green-700">{fee.fee_amount} ر.س</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">تاريخ الاستحقاق</p>
                      <p className="text-lg font-bold text-gray-900">
                        {new Date(fee.due_date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(fee.status)}
                </div>
              </div>

              {fee.ai_verification_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">ملاحظات التحقق:</span> {fee.ai_verification_notes}
                  </p>
                </div>
              )}

              {fee.status === 'paid' && fee.paid_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-green-900">
                    <CheckCircle className="w-5 h-5" />
                    <p className="text-sm">
                      تم السداد في: {new Date(fee.paid_at).toLocaleString('ar-SA')}
                    </p>
                  </div>
                </div>
              )}

              {(fee.status === 'pending_payment' || fee.status === 'late') && (
                <button
                  onClick={() => {
                    setCurrentFee(fee);
                    setShowUploadModal(true);
                  }}
                  disabled={uploadingFeeId === fee.id}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {uploadingFeeId === fee.id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      رفع إيصال رسوم التشغيل
                    </>
                  )}
                </button>
              )}

              {fee.status === 'under_review' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-blue-900 font-medium">
                    جاري مراجعة الإيصال بواسطة الذكاء الصناعي
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showUploadModal && currentFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">رفع إيصال السداد</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setCurrentFee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 mb-2">المبلغ المطلوب:</p>
                <p className="text-2xl font-bold text-green-700">{currentFee.fee_amount} ر.س</p>
              </div>

              <div className="mb-6">
                <label className="block text,sm font-medium text-gray-700 mb-3">
                  اختر صورة الإيصال
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-2">
                    تم اختيار: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  سيتم التحقق من الإيصال تلقائياً باستخدام الذكاء الصناعي للتأكد من المبلغ المدفوع
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUploadReceipt}
                  disabled={!selectedFile || uploadingFeeId === currentFee.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {uploadingFeeId === currentFee.id ? 'جاري الرفع...' : 'رفع وتحقق'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setCurrentFee(null);
                  }}
                  disabled={uploadingFeeId === currentFee.id}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
