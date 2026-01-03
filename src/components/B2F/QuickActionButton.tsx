import { useState } from 'react';
import { Zap, Package, Gift, Heart, ArrowRightLeft, MapPin, X } from 'lucide-react';

interface QuickActionButtonProps {
  onActionSelect: (action: string) => void;
}

export function QuickActionButton({ onActionSelect }: QuickActionButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const actions = [
    {
      id: 'harvest',
      label: 'استلام المحصول',
      icon: <Package className="w-5 h-5" />,
      color: 'from-emerald-500 to-green-600',
      description: 'طلب استلام المحصول'
    },
    {
      id: 'gift',
      label: 'إهداء',
      icon: <Gift className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-600',
      description: 'إهداء محصولك لشخص عزيز'
    },
    {
      id: 'charity',
      label: 'صدقة / وقف',
      icon: <Heart className="w-5 h-5" />,
      color: 'from-purple-500 to-indigo-600',
      description: 'التبرع بالمحصول'
    },
    {
      id: 'transfer',
      label: 'نقل عقد',
      icon: <ArrowRightLeft className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-600',
      description: 'نقل ملكية العقد'
    },
    {
      id: 'visit',
      label: 'زيارة / استفسار',
      icon: <MapPin className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-600',
      description: 'طلب زيارة أو استفسار'
    }
  ];

  const handleActionClick = (actionId: string) => {
    setShowMenu(false);
    onActionSelect(actionId);
  };

  return (
    <>
      {/* زر القرار السريع الثابت */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-emerald-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-10 flex-shrink-0">
        <button
          onClick={() => setShowMenu(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
        >
          {/* تأثير متحرك */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

          <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="relative">أريد إجراء الآن</span>
        </button>
      </div>

      {/* القائمة المنبثقة */}
      {showMenu && (
        <>
          {/* الخلفية */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in"
            onClick={() => setShowMenu(false)}
          />

          {/* القائمة */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[61] animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
            {/* رأس القائمة */}
            <div className="sticky top-0 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-emerald-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-gray-900">
                  ماذا تريد أن تفعل؟
                </h3>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                اختر الإجراء المناسب وسنساعدك في إتمامه
              </p>
            </div>

            {/* الخيارات */}
            <div className="p-4 space-y-3">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className="w-full group"
                >
                  <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    {/* الخلفية المتدرجة عند الـ hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    {/* المحتوى */}
                    <div className="relative bg-white group-hover:bg-transparent p-4 flex items-center gap-4 transition-colors duration-300">
                      {/* الأيقونة */}
                      <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <div className="text-white">
                          {action.icon}
                        </div>
                      </div>

                      {/* النص */}
                      <div className="flex-1 text-right">
                        <h4 className="font-black text-gray-900 group-hover:text-white transition-colors duration-300 mb-1">
                          {action.label}
                        </h4>
                        <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors duration-300">
                          {action.description}
                        </p>
                      </div>

                      {/* سهم */}
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:translate-x-[-4px]">
                        <svg
                          className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors duration-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* رسالة تذييلية */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-center text-gray-600">
                فريقنا جاهز لمساعدتك في أي وقت
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
