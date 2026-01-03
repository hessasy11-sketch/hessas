export type SubType = 'request' | 'offer';

interface CompanyTabsProps {
  activeTab: SubType;
  onTabChange: (tab: SubType) => void;
}

export function CompanyTabs({ activeTab, onTabChange }: CompanyTabsProps) {
  return (
    <div className="w-full bg-white/30 backdrop-blur-sm py-1 mb-2" dir="rtl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex gap-2">
          <button
            onClick={() => onTabChange('offer')}
            className="flex-1 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold"
            style={{
              background: activeTab === 'offer'
                ? 'linear-gradient(135deg, #3B82F6 0%, #2563eb 100%)'
                : 'rgba(255, 255, 255, 0.5)',
              color: activeTab === 'offer' ? 'white' : '#6B6B6B',
              boxShadow: activeTab === 'offer'
                ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              border: activeTab === 'offer' ? 'none' : '1px solid rgba(107, 107, 107, 0.15)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <span>📦</span>
              <span>العروض</span>
            </span>
          </button>

          <button
            onClick={() => onTabChange('request')}
            className="flex-1 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold"
            style={{
              background: activeTab === 'request'
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'rgba(255, 255, 255, 0.5)',
              color: activeTab === 'request' ? 'white' : '#6B6B6B',
              boxShadow: activeTab === 'request'
                ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              border: activeTab === 'request' ? 'none' : '1px solid rgba(107, 107, 107, 0.15)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🔍</span>
              <span>الطلبات</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
