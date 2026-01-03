import { useState, useEffect } from 'react';
import { ArrowRight, Settings, User, Phone, Bell, Shield, Sparkles, Moon, Grid, List, LogOut, Trash2, RotateCcw, Camera, Edit2, Check, X, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AccountSettingsViewProps {
  onBack: () => void;
}

export function AccountSettingsView({ onBack }: AccountSettingsViewProps) {
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [showIdVerifyModal, setShowIdVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    city: '',
    bio: '',
    phoneNumber: '',
    showPhone: false,
  });

  const [notifications, setNotifications] = useState({
    newBids: true,
    newOffers: true,
    auctionEnding: true,
    newRatings: true,
  });

  const [preferences, setPreferences] = useState({
    viewMode: 'grid' as 'grid' | 'list',
    darkMode: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.display_name || '',
        city: profile.city || '',
        bio: profile.bio || '',
        phoneNumber: profile.phone_number || '',
        showPhone: profile.show_phone || false,
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          city: formData.city,
          bio: formData.bio,
          phone_number: formData.phoneNumber,
          show_phone: formData.showPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setShowSuccessMessage(true);
      setEditMode(false);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWhatsApp = () => {
    const message = encodeURIComponent('مرحباً! أختبر رقم الواتساب من منصة حصص زراعية للاستثمار 🌾');
    window.open(`https://wa.me/${formData.phoneNumber}?text=${message}`, '_blank');
  };

  const handlePhoneVerify = async () => {
    if (!user || !formData.phoneNumber) {
      alert('يرجى إدخال رقم الجوال أولاً');
      return;
    }
    setShowPhoneVerifyModal(true);
  };

  const handleConfirmPhoneVerify = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setShowPhoneVerifyModal(false);
      setVerifyCode('');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء التوثيق');
    } finally {
      setLoading(false);
    }
  };

  const handleIdVerify = async () => {
    if (!user) return;
    setShowIdVerifyModal(true);
  };

  const handleConfirmIdVerify = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          id_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setShowIdVerifyModal(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء التوثيق');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      setFormData({
        displayName: profile.display_name || '',
        city: profile.city || '',
        bio: profile.bio || '',
        phoneNumber: profile.phone_number || '',
        showPhone: profile.show_phone || false,
      });
      setNotifications({
        newBids: true,
        newOffers: true,
        auctionEnding: true,
        newRatings: true,
      });
      setPreferences({
        viewMode: 'grid',
        darkMode: false,
      });
      setShowResetConfirm(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      await signOut();
      onBack();
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء حذف الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleSecureLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      setShowLogoutConfirm(false);
      onBack();
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            إعدادات الحساب
          </h1>
        </div>
        <p className="text-sm text-emerald-50 mt-1 mr-14">إدارة بياناتك وتفضيلات حسابك</p>
      </div>

      {showSuccessMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          تم حفظ إعداداتك بنجاح
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* الملف الشخصي */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              الملف الشخصي
            </h2>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                تعديل
              </button>
            )}
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                {profile?.display_name?.charAt(0) || 'م'}
              </div>
              {editMode && (
                <button className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 shadow-lg">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {editMode ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="الاسم الكامل"
                />
              ) : (
                <h3 className="text-xl font-bold text-gray-900">{formData.displayName}</h3>
              )}
              {profile?.phone_verified && (
                <div className="flex items-center gap-1 text-sm text-emerald-600 mt-1">
                  <CheckCircle className="w-4 h-4" />
                  حساب موثّق
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدينة / المنطقة</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!editMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50"
                placeholder="مثال: الرياض"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف بسيط</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!editMode}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 resize-none"
                placeholder="عرّف عن نفسك ونشاطك الزراعي..."
              />
            </div>
          </div>

          {editMode && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                حفظ التعديلات
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-6 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* بيانات التواصل */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-emerald-600" />
            بيانات التواصل (واتساب)
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الواتساب الأساسي</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
                <button
                  onClick={handleTestWhatsApp}
                  className="px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm whitespace-nowrap"
                >
                  اختبار
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showPhone}
                onChange={(e) => setFormData({ ...formData, showPhone: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">إظهار رقم الواتساب في المزادات</span>
            </label>
          </div>
        </div>

        {/* إدارة الإشعارات */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-emerald-600" />
            إدارة الإشعارات
          </h2>

          <div className="space-y-3">
            <ToggleItem
              icon="🔔"
              label="إشعار المزايدات الجديدة"
              checked={notifications.newBids}
              onChange={() => setNotifications(prev => ({ ...prev, newBids: !prev.newBids }))}
            />
            <ToggleItem
              icon="💬"
              label="إشعار عند تلقي عرض جديد"
              checked={notifications.newOffers}
              onChange={() => setNotifications(prev => ({ ...prev, newOffers: !prev.newOffers }))}
            />
            <ToggleItem
              icon="⏳"
              label="إشعار عند قرب انتهاء مزاد"
              checked={notifications.auctionEnding}
              onChange={() => setNotifications(prev => ({ ...prev, auctionEnding: !prev.auctionEnding }))}
            />
            <ToggleItem
              icon="⭐"
              label="إشعار عند تلقي تقييم جديد"
              checked={notifications.newRatings}
              onChange={() => setNotifications(prev => ({ ...prev, newRatings: !prev.newRatings }))}
            />
          </div>
        </div>

        {/* التحقق والمصداقية */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-600" />
            التحقق والمصداقية
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">توثيق الجوال</span>
              </div>
              {profile?.phone_verified ? (
                <span className="text-emerald-600 flex items-center gap-1 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  موثّق
                </span>
              ) : (
                <button
                  onClick={handlePhoneVerify}
                  className="text-emerald-600 text-sm font-medium hover:underline"
                >
                  توثيق الآن
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">توثيق الهوية (اختياري)</span>
              </div>
              {profile?.id_verified ? (
                <span className="text-emerald-600 flex items-center gap-1 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  موثّق
                </span>
              ) : (
                <button
                  onClick={handleIdVerify}
                  className="text-emerald-600 text-sm font-medium hover:underline"
                >
                  توثيق الآن
                </button>
              )}
            </div>

            <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-gray-900">تقييمك العام</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= (profile?.rating || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({(profile?.rating || 0).toFixed(1)} من 5)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* المساعد الذكي */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm p-4 sm:p-6 border border-emerald-100">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            المساعد الذكي الشخصي
          </h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              نشاطك الأخير: 3 مزادات نشطة، 12 مزايدة جديدة
            </p>
            <p className="flex items-start gap-2">
              <span className="text-amber-600">•</span>
              تذكير: عمولة المنصة 1% عند البيع
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              اقتراح: أضف صوراً أكثر لزيادة التفاعل بنسبة 37%
            </p>
          </div>
        </div>

        {/* إعدادات الاستخدام */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-emerald-600" />
            إعدادات الاستخدام
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">عرض المزادات</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreferences({ ...preferences, viewMode: 'grid' })}
                  className={`flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                    preferences.viewMode === 'grid'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Grid className="w-5 h-5 mb-1" />
                  <span className="text-xs">شبكية</span>
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, viewMode: 'list' })}
                  className={`flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                    preferences.viewMode === 'list'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <List className="w-5 h-5 mb-1" />
                  <span className="text-xs">قائمة</span>
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">الوضع الليلي</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.darkMode}
                onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* التحكم في الحساب */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-900">
            <AlertTriangle className="w-5 h-5 text-gray-600" />
            التحكم في الحساب
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <LogOut className="w-5 h-5" />
              تسجيل خروج آمن
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <RotateCcw className="w-5 h-5" />
              إعادة تعيين الإعدادات
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Trash2 className="w-5 h-5" />
              حذف الحساب نهائياً
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد حذف الحساب</h3>
              <p className="text-gray-600">
                سيتم حذف كل بياناتك ومزاداتك بشكل نهائي، هل ترغب بالمتابعة؟
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة توثيق الجوال */}
      {showPhoneVerifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">توثيق رقم الجوال</h3>
              <p className="text-sm text-gray-600 mb-4">
                سيتم إرسال رمز التحقق إلى رقم: <strong dir="ltr">{formData.phoneNumber}</strong>
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-blue-800 leading-relaxed">
                  💡 في النسخة التجريبية، اضغط "تأكيد" مباشرة لتوثيق رقمك
                </p>
              </div>

              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="أدخل رمز التحقق (اختياري)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg tracking-widest"
                dir="ltr"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmPhoneVerify}
                disabled={loading}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'جاري التوثيق...' : 'تأكيد التوثيق'}
              </button>
              <button
                onClick={() => {
                  setShowPhoneVerifyModal(false);
                  setVerifyCode('');
                }}
                className="px-6 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الخروج */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد تسجيل الخروج</h3>
              <p className="text-gray-600">
                هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSecureLogout}
                disabled={loading}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'جاري الخروج...' : 'نعم، خروج'}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد إعادة التعيين */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">إعادة تعيين الإعدادات</h3>
              <p className="text-gray-600">
                سيتم إعادة جميع الإعدادات إلى القيم الافتراضية. هل تريد المتابعة؟
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetSettings}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'جاري الإعادة...' : 'نعم، إعادة تعيين'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة توثيق الهوية */}
      {showIdVerifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">توثيق الهوية</h3>
              <p className="text-sm text-gray-600 mb-4">
                يساعد توثيق الهوية على زيادة الثقة في حسابك
              </p>

              <div className="space-y-3 mb-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-emerald-500 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">اضغط لرفع صورة الهوية (اختياري)</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    💡 في النسخة التجريبية، اضغط "تأكيد" مباشرة للحصول على علامة التوثيق
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmIdVerify}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'جاري التوثيق...' : 'تأكيد التوثيق'}
              </button>
              <button
                onClick={() => setShowIdVerifyModal(false)}
                className="px-6 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleItem({ icon, label, checked, onChange }: { icon: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
          style={{ right: checked ? 'auto' : '0.125rem' }}
        />
      </button>
    </div>
  );
}
