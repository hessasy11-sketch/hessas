import { useState, useEffect } from 'react';
import { QrCode, Download, Shield, User, Briefcase, Building2, Hash, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffData {
  id: string;
  full_name: string;
  staff_code: string;
  job_title: string;
  department: string;
  role: string;
  qr_code: string;
  qr_is_active: boolean;
  qr_generated_at: string;
}

export function MyQRCodeView() {
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyQRCode();
  }, []);

  const loadMyQRCode = async () => {
    try {
      const sessionStaffId = localStorage.getItem('admin_session_staff_id');

      if (!sessionStaffId) {
        throw new Error('لم يتم العثور على بيانات الجلسة');
      }

      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, full_name, staff_code, job_title, department, role, qr_code, qr_is_active, qr_generated_at')
        .eq('id', sessionStaffId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('لم يتم العثور على بياناتك');

      setStaffData(data);
    } catch (error) {
      console.error('Error loading QR:', error);
      alert('فشل تحميل بياناتك');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!staffData) return;

    const link = document.createElement('a');
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(staffData.qr_code)}`;
    link.download = `My-QR-${staffData.staff_code}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">خطأ في التحميل</h2>
          <p className="text-gray-600">لم يتم العثور على بياناتك</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
              <User className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{staffData.full_name}</h1>
            <p className="text-blue-100 text-lg">{staffData.job_title}</p>
          </div>

          {/* QR Code Section */}
          <div className="p-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(staffData.qr_code)}`}
                  alt="My QR Code"
                  className="w-full h-auto"
                />
              </div>

              {/* Status Badge */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {staffData.qr_is_active ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-bold">مفعّل ونشط</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-bold">معطّل</span>
                  </>
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">رقم الموظف</div>
                  <div className="font-bold text-gray-900">{staffData.staff_code}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">القسم</div>
                  <div className="font-bold text-gray-900">{staffData.department || 'عام'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">الدور الوظيفي</div>
                  <div className="font-bold text-gray-900">{staffData.role || 'موظف'}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={downloadQR}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5" />
              تحميل QR Code
            </button>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                كيفية الاستخدام
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• قم بمسح QR Code عند نقطة الدخول</li>
                <li>• سيتم التحقق من صلاحياتك تلقائياً</li>
                <li>• إذا كان لديك PIN، أدخله بعد المسح</li>
                <li>• احتفظ بهذا الرمز سرياً</li>
              </ul>
            </div>

            {/* Warning */}
            {!staffData.qr_is_active && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-800 text-center font-bold">
                  ⚠️ QR Code الخاص بك معطّل حالياً
                  <br />
                  تواصل مع المشرف لتفعيله
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>تم الإنشاء في {new Date(staffData.qr_generated_at).toLocaleDateString('ar-SA')}</p>
          <p className="mt-1">هذا الرمز خاص بك فقط - لا تشاركه مع أحد</p>
        </div>
      </div>
    </div>
  );
}
