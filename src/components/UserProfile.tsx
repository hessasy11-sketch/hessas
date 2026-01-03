import { User, MapPin, Settings, MessageCircle as WhatsApp, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  onBack: () => void;
  onViewMyAuctions: () => void;
  onManageAccount: () => void;
}

export function UserProfile({ onBack, onViewMyAuctions, onManageAccount }: UserProfileProps) {
  const { profile } = useAuth();

  const membershipId = profile?.id ? `ZR${profile.id.substring(0, 6).toUpperCase()}` : 'ZR000000';

  const handleWhatsAppContact = () => {
    if (!profile?.phone_number) {
      alert('رقم الجوال غير متوفر');
      return;
    }

    const message = `مرحباً، أنا ${profile.display_name} من منصة حصص زراعية للاستثمار 🌾`;
    let phoneNumber = profile.phone_number.replace(/\D/g, '');

    if (phoneNumber.startsWith('0')) {
      phoneNumber = '966' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('966')) {
      phoneNumber = '966' + phoneNumber;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3 shadow-lg">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white">حسابي</h2>
      </div>

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Cover Background */}
          <div className="h-32 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
            </div>
            <button
              onClick={onManageAccount}
              className="absolute top-4 left-4 bg-white/90 text-emerald-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-white transition-all shadow-lg flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              إدارة الحساب
            </button>
          </div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-4">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.display_name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <span className="text-white text-5xl font-bold">{profile?.display_name?.charAt(0) || 'م'}</span>
                </div>
              )}
            </div>

            {/* Name & Contact */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {profile?.display_name || 'مستخدم'}
                </h1>
                {!profile?.hide_phone && profile?.phone_number && (
                  <button
                    onClick={handleWhatsAppContact}
                    className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-all shadow-lg"
                    title="تواصل عبر واتساب"
                  >
                    <WhatsApp className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Verification Badges */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {profile?.verified_phone && (
                  <div className="inline-flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">رقم موثق</span>
                  </div>
                )}
                {profile?.verified_identity && (
                  <div className="inline-flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">هوية موثقة</span>
                  </div>
                )}
              </div>

              {profile?.city && (
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.city}</span>
                </div>
              )}

              {profile?.bio && (
                <p className="text-sm text-gray-600 max-w-md mx-auto mb-3 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                <span className="text-sm text-gray-600">رقم العضوية:</span>
                <span className="font-bold text-emerald-700">{membershipId}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl text-center border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-700">0</div>
                <div className="text-xs text-gray-600 mt-1">مزاد نشط</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">0</div>
                <div className="text-xs text-gray-600 mt-1">مزاد منتهي</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl text-center border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">0</div>
                <div className="text-xs text-gray-600 mt-1">إجمالي المبيعات</div>
              </div>
            </div>

            {/* Account Type Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 rounded-xl shadow-lg">
                <span className="text-white font-bold text-sm">
                  {profile?.account_type === 'farm' ? '🌾 مزرعة' :
                   profile?.account_type === 'company' ? '🏢 شركة' :
                   profile?.user_type === 'platform_admin' ? '⭐ مدير المنصة' :
                   '👤 فرد'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* My Auctions Section */}
        <div className="mt-6">
          <button
            onClick={onViewMyAuctions}
            className="w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌾</span>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-gray-800">مزاداتي وعروضي الزراعية</h3>
                  <p className="text-sm text-gray-500">إدارة جميع المزادات والعروض</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition-all transform group-hover:-translate-x-1" />
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}
