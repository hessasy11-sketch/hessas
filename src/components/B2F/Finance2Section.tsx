import { useState } from 'react';
import { FileText, Smartphone, DollarSign, Activity } from 'lucide-react';
import InvestmentInvoicesTab from './finance2/InvestmentInvoicesTab';
import PaymentGatewaysV2Tab from './finance2/PaymentGatewaysV2Tab';
import PaymentsCollectionTab from './finance2/PaymentsCollectionTab';
import FinancialOperationsLogTab from './finance2/FinancialOperationsLogTab';

type TabId = 'invoices' | 'gateways' | 'payments' | 'logs';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
  gradient: string;
}

const tabs: Tab[] = [
  {
    id: 'invoices',
    label: 'فاتورة الاستثمار',
    icon: FileText,
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'gateways',
    label: 'بوابات الدفع',
    icon: Smartphone,
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    id: 'payments',
    label: 'المدفوعات والتحصيل',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'logs',
    label: 'سجل العمليات المالية',
    icon: Activity,
    gradient: 'from-slate-500 to-gray-700'
  }
];

export default function Finance2Section() {
  const [activeTab, setActiveTab] = useState<TabId>('invoices');

  const renderContent = () => {
    switch (activeTab) {
      case 'invoices':
        return <InvestmentInvoicesTab />;
      case 'gateways':
        return <PaymentGatewaysV2Tab />;
      case 'payments':
        return <PaymentsCollectionTab />;
      case 'logs':
        return <FinancialOperationsLogTab />;
      default:
        return <InvestmentInvoicesTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <DollarSign className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-2">مالية 2</h1>
            <p className="text-amber-100 text-base">نظام إدارة الفواتير والمدفوعات والتحصيل المالي</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-2 shadow-lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl font-bold transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-xl scale-105`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {renderContent()}
      </div>
    </div>
  );
}
