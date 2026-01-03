import { Home, Plus, User, Search } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { B2FNotificationCenter } from './B2FNotificationCenter';
import { HiddenStaffAccess } from './HiddenStaffAccess';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import AIAssistantModal from './B2F/AIAssistantModal';
import { useInvestorAuth } from '../contexts/InvestorAuthContext';
import { useNewActionsBadge } from '../hooks/useNewActionsBadge';

interface FooterProps {
  onAddAuction: () => void;
  onSearchClick: () => void;
  onNavigate: (page: string) => void;
  onMenuClick: () => void;
  activeSection?: string;
  onB2FSidebarOpen?: () => void;
}

export function Footer({
  onAddAuction,
  onSearchClick,
  onNavigate,
  onMenuClick,
  activeSection,
  onB2FSidebarOpen
}: FooterProps) {
  const { user, profile } = useAuth();
  const { investorPhone } = useInvestorAuth();
  const { actionCount } = useNewActionsBadge(investorPhone);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const handleAccountClick = () => {
    if (activeSection === 'b2f' && onB2FSidebarOpen) {
      onB2FSidebarOpen();
    } else {
      onMenuClick();
    }
  };


  return (
    <>
      <div className={`block md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom pb-12 ${
        activeSection === 'b2f'
          ? 'bg-emerald-50/80 border-emerald-100/50'
          : 'bg-amber-50/80 border-amber-100/50'
      }`}>
        <div className="flex items-center justify-around px-2 py-2 relative">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 ${
              activeSection === 'b2f'
                ? 'text-emerald-600 hover:text-emerald-700 active:text-emerald-800'
                : 'text-amber-600 hover:text-amber-700 active:text-amber-800'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </button>

          <button
            onClick={onSearchClick}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 ${
              activeSection === 'b2f'
                ? 'text-gray-500 hover:text-emerald-600 active:text-emerald-700'
                : 'text-gray-500 hover:text-amber-600 active:text-amber-700'
            }`}
          >
            <div className="relative">
              <Search className="w-5 h-5" />
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                activeSection === 'b2f' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></div>
            </div>
            <span className="text-[10px] font-medium">بحث</span>
          </button>

          <div className="flex flex-col items-center -mt-4">
            {activeSection === 'b2f' ? (
              <>
                <button
                  onClick={() => setShowAIAssistant(true)}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 shadow-lg transition-all duration-300 active:scale-95 mb-1 border-2 border-emerald-100"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <span className="text-3xl">🤖</span>
                </button>
                <span className="text-[10px] font-medium text-emerald-600">مساعد ذكي</span>
              </>
            ) : (
              <>
                <button
                  onClick={onAddAuction}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg transition-all duration-300 active:scale-95 mb-1"
                  style={{
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                  }}
                >
                  <Plus className="w-6 h-6" />
                </button>
                <span className="text-[10px] font-medium text-amber-600">إضافة</span>
              </>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            {activeSection === 'b2f' ? (
              <B2FNotificationCenter onNavigate={onNavigate} />
            ) : (
              <NotificationCenter onNavigate={onNavigate} activeSection={activeSection} />
            )}
          </div>

          <button
            onClick={handleAccountClick}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 ${
              activeSection === 'b2f'
                ? 'text-gray-500 hover:text-emerald-600 active:text-emerald-700'
                : 'text-gray-500 hover:text-amber-600 active:text-amber-700'
            }`}
          >
            <div className="relative">
              {user && profile ? (
                profile.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.display_name}
                    className={`w-7 h-7 rounded-full object-cover border-2 shadow-md ${
                      activeSection === 'b2f' ? 'border-emerald-500' : 'border-amber-500'
                    }`}
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md ${
                    activeSection === 'b2f'
                      ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-400'
                      : 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-amber-400'
                  }`}>
                    <span className="text-white font-bold text-xs">
                      {profile.display_name?.charAt(0) || 'م'}
                    </span>
                  </div>
                )
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md ${
                  activeSection === 'b2f'
                    ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-400'
                    : 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-amber-400'
                }`}>
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              {activeSection === 'b2f' && actionCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                  <span className="text-[10px] font-black text-white px-1">
                    {actionCount > 9 ? '9+' : actionCount}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">
              {user && profile ? 'حسابي' : 'دخول'}
            </span>
          </button>
        </div>
      </div>

      <footer className="hidden md:block mt-auto bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
            <div>
              <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <span className="text-2xl">🌾</span>
                الحبر للمزادات
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                منصة متخصصة للمزادات الزراعية توفر بيئة آمنة وموثوقة لبيع وشراء المنتجات والمعدات الزراعية
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => onNavigate('home')}
                    className="text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    الرئيسية
                  </button>
                </li>
                <li>
                  <button
                    onClick={onSearchClick}
                    className="text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    البحث
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-4">تواصل معنا</h4>
              <p className="text-sm text-gray-600">
                للاستفسارات والدعم الفني
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              © {new Date().getFullYear()} الحبر للمزادات الزراعية. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>

      <HiddenStaffAccess onNavigate={onNavigate} />

      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>

      {showAIAssistant && activeSection === 'b2f' && (
        <AIAssistantModal
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          investorPhone={investorPhone || ''}
        />
      )}
    </>
  );
}
