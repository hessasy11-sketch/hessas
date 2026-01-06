import { useState } from 'react';
import { Globe, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onNavigate: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 50%, rgba(16, 185, 129, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-20 md:h-24">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoginClick}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-green-900 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 backdrop-blur-sm border border-green-300 transition-all shadow-md hover:shadow-lg"
              style={{
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
              title="تسجيل الدخول للموظفين"
            >
              <Leaf className="w-4 sm:w-4 h-4 sm:h-4 text-green-600" />
              <span className="hidden sm:inline font-bold">دخول الموظفين</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-emerald-900 bg-white/70 hover:bg-white/90 backdrop-blur-sm border border-white/30 transition-all shadow-sm hover:shadow-md"
              style={{
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              }}
            >
              <Globe className="w-4 sm:w-4 h-4 sm:h-4" />
              <span className="hidden sm:inline">{language === 'ar' ? 'عربي' : 'English'}</span>
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 sm:gap-4 md:gap-5">
            <div
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg transform hover:scale-110 transition-transform duration-300"
              style={{
                filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3))',
              }}
            >
              🌾
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg whitespace-nowrap"
              style={{
                textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 255, 255, 0.3)',
                letterSpacing: '1px',
              }}
            >
              حصص زراعية للاستثمار
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
