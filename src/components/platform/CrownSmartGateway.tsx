import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGatewayAccess } from '../../hooks/useGatewayAccess';
import SmartGatewayCard from './SmartGatewayCard';
import StaffLoginForm from './StaffLoginForm';
import { Crown, LogOut, RefreshCw, Shield, AlertTriangle, XCircle, User } from 'lucide-react';

interface StaffSession {
  staffId: string;
  staffName: string;
  role: string;
  department?: string;
  loginAt: string;
}

export default function CrownSmartGateway() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const { cards, loading, refresh } = useGatewayAccess(userId || undefined);

  const errorParam = searchParams.get('error');

  // DEBUG: تفعيل مؤقت
  useEffect(() => {
    if (staffSession && !loading) {
      console.log('🔍 GATEWAY DEBUG:');
      console.log('Session:', staffSession);
      console.log('User ID:', userId);
      console.log('Role:', staffSession.role);
      console.log('Department:', staffSession.department);
      console.log('Is GM:', staffSession.role === 'general_manager');
      console.log('Cards Count:', cards.length);
      console.log('Cards:', cards);
    }
  }, [staffSession, userId, cards, loading]);

  useEffect(() => {
    const savedSession = localStorage.getItem('staff_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as StaffSession;
        setStaffSession(session);
        setUserId(session.staffId);
      } catch (err) {
        console.error('Error parsing session:', err);
        localStorage.removeItem('staff_session');
        setShowLogin(true);
      }
    } else {
      setShowLogin(true);
    }
  }, []);

  const handleLoginSuccess = (staffId: string, staffName: string, role: string) => {
    setStaffSession({
      staffId,
      staffName,
      role,
      loginAt: new Date().toISOString(),
    });
    setUserId(staffId);
    setShowLogin(false);

    // إذا لم يكن GM، اذهب مباشرة إلى my-work
    if (role !== 'general_manager') {
      setTimeout(() => {
        navigate('/admin/my-work');
      }, 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_session');
    setStaffSession(null);
    setUserId(null);
    setShowLogin(true);
  };

  const clearError = () => {
    searchParams.delete('error');
    setSearchParams(searchParams);
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'no_session':
        return 'لا يوجد جلسة نشطة. يرجى تسجيل الدخول أولاً.';
      case 'no_permission':
        return 'لا تملك صلاحية للوصول إلى الصفحة المطلوبة.';
      case 'access_denied':
        return 'تم رفض الوصول. يرجى التواصل مع المدير العام.';
      default:
        return 'حدث خطأ في الوصول. يرجى المحاولة مرة أخرى.';
    }
  };

  if (showLogin) {
    return <StaffLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري تحميل البوابة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
                <Crown className="w-8 h-8 text-yellow-300" />
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-1">بوابة الدخول الذكية</h1>
                <p className="text-purple-100 text-lg">Crown Smart Gateway</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {staffSession && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{staffSession.staffName}</span>
                </div>
              )}

              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium">تحديث</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {errorParam && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-red-900">تم منع الوصول</h3>
                  <button
                    onClick={clearError}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-red-700 leading-relaxed">
                  {getErrorMessage(errorParam)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">مرحباً بك في البوابة</h2>
              <p className="text-gray-600 leading-relaxed">
                زر التاج = نقطة الدخول الوحيدة. كل مستخدم يرى فقط ما يخص عمله. المدير العام يدخل كل شيء بلا حدود.
              </p>
            </div>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد بطاقات متاحة</h3>
            <p className="text-gray-600">
              لم يتم منحك صلاحيات الوصول بعد. يرجى التواصل مع المدير العام.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                البطاقات المتاحة ({cards.length})
              </h2>
              <span className="text-sm text-gray-600">
                اضغط على أي بطاقة للدخول
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cards.map((card) => (
                <SmartGatewayCard key={card.id} card={card} />
              ))}
            </div>
          </>
        )}

        <div className="mt-8 bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 mb-1">نظام أمان متقدم</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                لا تسجيل ذاتي. جميع الحسابات والصلاحيات تُنشأ من المدير العام أو من ينوب عنه فقط.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
