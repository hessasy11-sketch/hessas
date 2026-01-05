import { useState } from 'react';
import {
  Mail,
  Check,
  Phone,
  Key,
  Shield,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  User,
  Crown,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface InvitationDetails {
  invitation_id: string;
  invitee_name: string;
  role_code: string;
  scope_type: string;
  scope_farm_id: string | null;
}

export default function InviteAcceptancePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'details' | 'pin' | 'success'>('input');
  const [inviteCode, setInviteCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [landingRoute, setLandingRoute] = useState('');

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      setError('الرجاء إدخال كود الدعوة');
      return;
    }

    if (!phone.trim()) {
      setError('الرجاء إدخال رقم الجوال');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('verify_invitation_code', {
        p_invite_code: inviteCode.trim().toUpperCase(),
        p_phone: phone.trim()
      });

      if (rpcError) throw rpcError;

      if (data.valid) {
        setInvitationDetails(data);
        setStep('details');
      } else {
        setError(data.message || 'فشل التحقق من الدعوة');
      }
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError('حدث خطأ أثناء التحقق من الدعوة');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('accept_authority_invitation', {
        p_invite_code: inviteCode.trim().toUpperCase(),
        p_phone: phone.trim(),
        p_pin_code: pinCode.trim() || null
      });

      if (rpcError) throw rpcError;

      if (data.success) {
        setSuccessMessage(data.message);
        setLandingRoute(data.landing_route);
        setStep('success');

        // التوجيه التلقائي بعد 2 ثانية
        setTimeout(() => {
          navigate(data.landing_route);
        }, 2000);
      } else {
        setError(data.message || 'فشل قبول الدعوة');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('حدث خطأ أثناء قبول الدعوة');
    } finally {
      setLoading(false);
    }
  };

  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      platform: 'المنصة الكاملة',
      b2f: 'قسم B2F',
      b2b: 'قسم B2B',
      farm: 'مزرعة محددة'
    };
    return labels[scope] || scope;
  };

  const getScopeColor = (scope: string) => {
    const colors: Record<string, string> = {
      platform: 'bg-gradient-to-r from-blue-500 to-blue-600',
      b2f: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      b2b: 'bg-gradient-to-r from-blue-500 to-blue-600',
      farm: 'bg-gradient-to-r from-green-500 to-green-600'
    };
    return colors[scope] || 'bg-gradient-to-r from-slate-500 to-slate-600';
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-3">مرحباً بك!</h2>
          <p className="text-lg text-emerald-600 font-bold mb-6">{successMessage}</p>

          <div className="bg-slate-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 text-slate-700 mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-bold">جاري التوجيه إلى لوحة التحكم...</span>
            </div>
            <p className="text-sm text-slate-600">المسار: {landingRoute}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Sparkles className="w-4 h-4" />
            <span>تم تفعيل حسابك بنجاح</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">قبول الدعوة الإدارية</h1>
          <p className="text-blue-100 text-lg">أهلاً بك في فريق العمل</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-bold text-sm">{error}</p>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  كود الدعوة <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    className="w-full px-4 py-4 pr-12 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold tracking-wider font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all uppercase"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-2">أدخل الكود المكون من 8 أحرف/أرقام</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-4 py-4 pr-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
                  />
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-2">رقم الجوال المسجل في الدعوة</p>
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    التحقق من الدعوة
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'details' && invitationDetails && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border-2 border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">مرحباً</p>
                    <h3 className="text-xl font-bold text-slate-900">{invitationDetails.invitee_name}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white rounded-xl p-3">
                    <span className="text-sm text-slate-600">الدور:</span>
                    <span className="font-bold text-slate-900">{invitationDetails.role_code}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded-xl p-3">
                    <span className="text-sm text-slate-600">النطاق:</span>
                    <span className={`px-3 py-1 ${getScopeColor(invitationDetails.scope_type)} text-white rounded-lg text-sm font-bold`}>
                      {getScopeLabel(invitationDetails.scope_type)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  رمز PIN (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="أدخل 4 أرقام (اختياري)"
                    maxLength={4}
                    className="w-full px-4 py-4 pr-12 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold tracking-wider font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-2">يمكنك تعيين رمز PIN للدخول السريع (اختياري)</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold mb-1">ماذا سيحدث بعد الموافقة؟</p>
                    <ul className="space-y-1 text-xs">
                      <li>• سيتم تفعيل حسابك تلقائياً</li>
                      <li>• ستحصل على جميع الصلاحيات المخصصة</li>
                      <li>• سيتم إنشاء QR Code خاص بك</li>
                      <li>• سيتم توجيهك إلى لوحة التحكم</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      جاري التفعيل...
                    </>
                  ) : (
                    <>
                      <Crown className="w-6 h-6" />
                      قبول وتفعيل الحساب
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-4 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                >
                  رجوع
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-8 py-4 flex items-center justify-center gap-2 text-sm text-slate-600">
          <Shield className="w-4 h-4" />
          <span>نظام آمن ومشفر</span>
        </div>
      </div>
    </div>
  );
}
