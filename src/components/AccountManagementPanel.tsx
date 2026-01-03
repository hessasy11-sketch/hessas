import { useState, useRef } from 'react';
import { X, Upload, Trash2, Save, User, Phone, MapPin, FileText, Bell, Shield, LogOut, RefreshCw, AlertCircle, CheckCircle, Camera, Briefcase, Home as HomeIcon, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AccountManagementPanelProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AccountManagementPanel({ onClose, onSuccess }: AccountManagementPanelProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    displayName: profile?.display_name || '',
    phoneNumber: profile?.phone_number || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
    accountType: profile?.account_type || 'individual',
    hidePhone: profile?.hide_phone || false,
    notificationNewBids: profile?.notification_new_bids !== false,
    notificationNewOffers: profile?.notification_new_offers !== false,
    notificationAuctionEnding: profile?.notification_auction_ending !== false,
  });

  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('الصيغة المسموحة: PNG, JPG, SVG فقط');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/logo.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setSuccess('تم رفع الصورة بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;

    if (!window.confirm('هل ترغب في إزالة الشعار الحالي؟')) return;

    setUploading(true);
    setError('');

    try {
      const fileName = `${user?.id}/logo.${logoUrl.split('.').pop()}`;

      await supabase.storage
        .from('profile-images')
        .remove([fileName]);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: null })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setLogoUrl('');
      setSuccess('تم إزالة الشعار بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل إزالة الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          phone_number: formData.phoneNumber,
          city: formData.city,
          bio: formData.bio || null,
          account_type: formData.accountType,
          hide_phone: formData.hidePhone,
          notification_new_bids: formData.notificationNewBids,
          notification_new_offers: formData.notificationNewOffers,
          notification_auction_ending: formData.notificationAuctionEnding,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setSuccess('تم حفظ التعديلات بنجاح!');
      setTimeout(() => {
        setSuccess('');
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'farm': return <HomeIcon className="w-5 h-5" />;
      case 'company': return <Building className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'farm': return 'مزرعة';
      case 'company': return 'شركة';
      default: return 'فرد';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] overflow-y-auto" dir="rtl">
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">إدارة الحساب الشخصي</h2>
                  <p className="text-sm text-emerald-100">حصص زراعية للاستثمار</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {(profile?.verified_phone || profile?.verified_identity) && (
              <div className="mt-4 flex gap-2">
                {profile?.verified_phone && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    رقم موثق
                  </div>
                )}
                {profile?.verified_identity && (
                  <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    هوية موثقة
                  </div>
                )}
              </div>
            )}

            {!profile?.verified_identity && (
              <div className="mt-4 bg-amber-500/20 backdrop-blur border border-amber-300/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-100 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-50 leading-relaxed">
                  أكمل توثيق حسابك لزيادة مصداقيتك في المزادات
                </p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Logo Upload Section */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {logoUrl ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-200 shadow-lg">
                      <img src={logoUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border-2 border-emerald-200">
                      <Camera className="w-10 h-10 text-emerald-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">الشعار أو الصورة الشخصية</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    تظهر في المزادات، الملف الشخصي، والشات
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {logoUrl ? 'تغيير الصورة' : 'رفع صورة'}
                        </>
                      )}
                    </button>

                    {logoUrl && (
                      <button
                        onClick={handleRemoveLogo}
                        disabled={uploading}
                        className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, SVG • حد أقصى 2 ميجابايت
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                المعلومات الأساسية
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الحساب
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['individual', 'farm', 'company'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, accountType: type })}
                      className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex flex-col items-center gap-2 ${
                        formData.accountType === type
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {getAccountTypeIcon(type)}
                      {getAccountTypeName(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة / المنطقة
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full pl-4 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف بسيط
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  rows={3}
                  placeholder="عرّف عن نفسك ونشاطك الزراعي..."
                />
              </div>
            </div>

            {/* Phone Management */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                إدارة رقم التواصل
              </h3>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">رقم الواتساب</span>
                  <span className="font-bold text-gray-900" dir="ltr">{formData.phoneNumber}</span>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hidePhone}
                    onChange={(e) => setFormData({ ...formData, hidePhone: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">
                    إخفاء رقمي في المزادات العامة
                  </span>
                </label>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                خيارات الإشعارات
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">المزايدات الجديدة</span>
                  <input
                    type="checkbox"
                    checked={formData.notificationNewBids}
                    onChange={(e) => setFormData({ ...formData, notificationNewBids: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">العروض القادمة</span>
                  <input
                    type="checkbox"
                    checked={formData.notificationNewOffers}
                    onChange={(e) => setFormData({ ...formData, notificationNewOffers: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="text-sm text-gray-700">انتهاء المزاد</span>
                  <input
                    type="checkbox"
                    checked={formData.notificationAuctionEnding}
                    onChange={(e) => setFormData({ ...formData, notificationAuctionEnding: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>

            {/* Smart Assistant */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-teal-900 text-sm mb-1">
                    مساعد الحراج الذكي
                  </p>
                  <p className="text-xs text-teal-800 leading-relaxed">
                    {logoUrl
                      ? 'حسابك نشط! جرب نشر مزاد جديد لجذب المزيد من المزايدين.'
                      : 'أضف شعار أو صورة شخصية لزيادة مصداقيتك وجذب المزيد من المزايدين.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">{success}</p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  حفظ التعديلات
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
