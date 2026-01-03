import { useState } from 'react';
import { ShoppingCart, Wallet, TrendingUp } from 'lucide-react';
import CollectionQueueView from '../sales/CollectionQueueView';
import PaymentOpenView from '../sales/PaymentOpenView';

type SalesSubTab = 'collection' | 'payment_open';

export default function SalesTab() {
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('collection');

  const subTabs = [
    {
      id: 'collection' as SalesSubTab,
      title: 'قائمة التجميع',
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-cyan-600',
      description: 'الطلبات في مرحلة الحجز الأولي'
    },
    {
      id: 'payment_open' as SalesSubTab,
      title: 'طلبات مفتوح لها الدفع',
      icon: Wallet,
      gradient: 'from-amber-500 to-orange-600',
      description: 'في انتظار رفع إيصالات الدفع'
    }
  ];

  return (
    <div className="space-y-4">
      {/* رأس القسم */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black">قسم المبيعات</h2>
            <p className="text-sm text-white/90">إدارة الطلبات من الحجز حتى الاعتماد المالي</p>
          </div>
        </div>
      </div>

      {/* التبويبات الفرعية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`
                relative overflow-hidden rounded-xl p-5 text-right transition-all duration-300
                ${isActive
                  ? `bg-gradient-to-br ${tab.gradient} text-white shadow-xl scale-105`
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="relative z-10">
                <div className={`
                  w-12 h-12 rounded-lg mb-3 flex items-center justify-center
                  ${isActive ? 'bg-white/20 backdrop-blur-sm' : 'bg-gradient-to-br ' + tab.gradient + ' text-white'}
                `}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-1">{tab.title}</h3>
                <p className={`text-sm ${isActive ? 'text-white/90' : 'text-gray-500'}`}>
                  {tab.description}
                </p>
              </div>

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* المحتوى */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {activeSubTab === 'collection' && <CollectionQueueView />}
        {activeSubTab === 'payment_open' && <PaymentOpenView />}
      </div>
    </div>
  );
}
