import { useState, useEffect } from 'react';
import { X, LogOut, Plus, Shield } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicPlans } from '../hooks/useDynamicPlans';
import sidebarPublic from '../data/sidebar_public.json';
import sidebarDefault from '../data/sidebar_default.json';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  currentSection?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  action: string;
}

interface SidebarData {
  sectionName: string;
  sectionId: string;
  color: {
    primary: string;
    light: string;
    text: string;
  };
  icon: string;
  items: SidebarItem[];
}

export function Sidebar({ isOpen, onClose, onNavigate, currentSection = 'public' }: SidebarProps) {
  const { user, profile, signOut } = useAuth();
  const { userStatus } = useDynamicPlans();
  const [sidebarData, setSidebarData] = useState<SidebarData>(sidebarDefault);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      if (currentSection === 'public') {
        setSidebarData(sidebarPublic);
      } else {
        setSidebarData(sidebarDefault);
      }
      setIsAnimating(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [currentSection]);

  const handleItemClick = (action: string) => {
    onNavigate(action);
    onClose();
  };

  const handleSignOut = async () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      await signOut();
      onClose();
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 sm:w-6 h-5 sm:h-6" /> : null;
  };

  const getPlanBadge = () => {
    if (!userStatus?.current_plan_type) {
      return {
        label: 'تفعيل ذكي فوري',
        icon: '💳',
        gradient: 'from-amber-400 via-orange-500 to-amber-400',
        bgColor: 'bg-amber-50'
      };
    }

    switch (userStatus.current_plan_type) {
      case 'free':
        return {
          label: 'الباقة المجانية • نشطة',
          icon: '🔰',
          gradient: 'from-gray-400 via-gray-600 to-gray-400',
          bgColor: 'bg-gray-50'
        };
      case 'silver':
        return {
          label: 'الباقة الفضية • نشطة',
          icon: '🥈',
          gradient: 'from-slate-300 via-slate-500 to-slate-300',
          bgColor: 'bg-slate-50'
        };
      case 'gold':
        return {
          label: 'الباقة الذهبية • نشطة',
          icon: '🥇',
          gradient: 'from-yellow-300 via-amber-500 to-yellow-300',
          bgColor: 'bg-yellow-50'
        };
      default:
        return {
          label: 'تفعيل ذكي فوري',
          icon: '💳',
          gradient: 'from-amber-400 via-orange-500 to-amber-400',
          bgColor: 'bg-amber-50'
        };
    }
  };

  const planBadge = getPlanBadge();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-[101] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-[85%] sm:w-80`}
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          <div
            className="p-4 sm:p-6 text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${sidebarData.color.primary}, ${sidebarData.color.primary}dd)`
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl sm:text-4xl">{sidebarData.icon}</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">{sidebarData.sectionName}</h2>
                  {user && profile && (
                    <p className="text-xs sm:text-sm text-white/80">{profile.display_name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && profile?.logo_url && (
              <div className="relative flex justify-center mb-3">
                <img
                  src={profile.logo_url}
                  alt={profile.display_name}
                  className="w-16 h-16 rounded-full border-4 border-white/30 shadow-lg object-cover"
                />
              </div>
            )}

            {/* معلومات الحساب والباقة */}
            {user && (
              <div className="relative mt-4 pt-3 border-t border-white/20">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                    <div className="text-white/70 text-[10px] mb-0.5">نوع الحساب</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>👤</span>
                      <span>{profile?.account_type === 'company' ? 'شركة' : 'فردي'}</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                    <div className="text-white/70 text-[10px] mb-0.5">القسم النشط</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>{sidebarData.icon}</span>
                      <span className="truncate">{sidebarData.sectionName.replace('القائمة ', '')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 bg-gradient-to-r from-amber-400/20 to-orange-500/20 rounded-lg px-3 py-2 backdrop-blur-sm border border-white/10">
                  <div className="text-white/70 text-[10px] mb-0.5">الباقة الحالية</div>
                  <div className="font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{planBadge.icon}</span>
                      <span>{userStatus?.current_plan_type === 'free' ? 'مجانية' : userStatus?.current_plan_type === 'silver' ? 'فضية' : userStatus?.current_plan_type === 'gold' ? 'ذهبية' : 'غير مفعلة'}</span>
                    </div>
                    {userStatus?.current_plan_type && (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {user && (
              <button
                onClick={() => handleItemClick('addAuction')}
                className="w-full p-3 sm:p-4 rounded-xl font-medium text-sm sm:text-base transition-all flex items-center gap-3 text-white shadow-md hover:shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${sidebarData.color.primary}, ${sidebarData.color.primary}dd)`
                }}
              >
                <Plus className="w-5 h-5" />
                <span>أضف مزاد جديد</span>
              </button>
            )}

            <div className={`space-y-1 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              {sidebarData.items.map((item) => {
                // تصميم خاص لزر الباقات
                if (item.id === 'subscriptions' && user) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.action)}
                      className="w-full p-4 sm:p-5 rounded-2xl font-bold text-sm sm:text-base transition-all hover:scale-[1.02] relative overflow-hidden group shadow-xl hover:shadow-2xl my-3"
                      style={{
                        background: `linear-gradient(135deg,
                          #f59e0b 0%,
                          #f97316 25%,
                          #eab308 50%,
                          #f97316 75%,
                          #f59e0b 100%)`,
                        backgroundSize: '200% 200%',
                        animation: 'gradient 3s ease infinite',
                      }}
                    >
                      {/* 3D Border Effect */}
                      <div className="absolute inset-0 rounded-2xl shadow-inner" style={{
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)'
                      }} />

                      {/* Shine Effect */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                          backgroundSize: '200% 200%',
                          animation: 'shine 2s ease infinite'
                        }}
                      />

                      {/* Content */}
                      <div className="relative flex items-center gap-3 text-white drop-shadow-lg">
                        <span className="text-3xl animate-pulse" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                          {planBadge.icon}
                        </span>
                        <div className="flex-1 text-right">
                          <div className="font-black text-base sm:text-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                            {item.label}
                          </div>
                          <div className="text-xs sm:text-sm opacity-95 font-medium">
                            {userStatus?.current_plan_type ? 'مفعلة' : 'غير مفعلة'}
                          </div>
                        </div>
                        {userStatus?.current_plan_type && (
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg" />
                        )}
                      </div>

                      {/* Corner Lights */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-20 rounded-full blur-xl -mr-8 -mt-8" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-20 rounded-full blur-xl -ml-8 -mb-8" />
                    </button>
                  );
                }

                // تصميم عادي لباقي الأزرار
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.action)}
                    className="w-full p-3 sm:p-4 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    {getIcon(item.icon)}
                    <span className="text-sm sm:text-base">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {user ? (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="w-full p-3 sm:p-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium text-sm sm:text-base hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  handleItemClick('signup');
                }}
                className="w-full p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm sm:text-base hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Shield className="w-5 h-5" />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
