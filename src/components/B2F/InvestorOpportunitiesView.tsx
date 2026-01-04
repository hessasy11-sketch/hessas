import { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Loader, TreePine, Menu } from 'lucide-react';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import OpportunityCategorySlider from './OpportunityCategorySlider';
import OpportunityCard3D from './OpportunityCard3D';
import InvestmentInfoModal from './InvestmentInfoModal';
import { TreeInvestmentDetailsPage } from './TreeInvestmentDetailsPage';
import { TreeBookingPage } from './TreeBookingPage';
import { InvestorSidebar } from './InvestorSidebar';

interface InvestorOpportunitiesViewProps {
  onBack?: () => void;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (isOpen: boolean) => void;
}

interface OpportunityForBooking {
  id: string;
  farm_id: string;
  title: string;
  tree_type: string;
  custom_tree_type: string | null;
  price_per_tree: number;
  min_trees: number;
  max_trees: number | null;
  available_trees: number;
  contract_duration_years: number;
}

export default function InvestorOpportunitiesView({
  onBack,
  sidebarOpen,
  onSidebarOpenChange
}: InvestorOpportunitiesViewProps) {
  const { opportunities, loading, reloadOpportunities } = useOpportunities();
  const { user, refreshAccountFromPhone } = useInvestorAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [bookingOpportunity, setBookingOpportunity] = useState<OpportunityForBooking | null>(null);

  useEffect(() => {
    refreshAccountFromPhone();
  }, []);

  const activeOpportunities = opportunities.filter(
    opp => opp.status === 'active' && opp.is_active
  );

  const availableTreeTypes = useMemo(() => {
    const types = new Set<string>();
    activeOpportunities.forEach(opp => {
      if (opp.tree_type === 'أخرى') {
        types.add('أخرى');
      } else {
        types.add(opp.tree_type);
      }
    });
    return Array.from(types);
  }, [activeOpportunities]);

  const filteredOpportunities = useMemo(() => {
    if (selectedCategory === 'all') {
      return activeOpportunities;
    }

    return activeOpportunities.filter(opp => {
      if (selectedCategory === 'أخرى') {
        return opp.tree_type === 'أخرى';
      }
      return opp.tree_type === selectedCategory;
    });
  }, [activeOpportunities, selectedCategory]);

  if (bookingOpportunity) {
    return (
      <TreeBookingPage
        opportunity={bookingOpportunity}
        onBack={() => setBookingOpportunity(null)}
        onSuccess={() => {
          setBookingOpportunity(null);
          reloadOpportunities();
          if (onSidebarOpenChange) {
            onSidebarOpenChange(true);
          }
        }}
      />
    );
  }

  if (selectedOpportunityId) {
    return (
      <TreeInvestmentDetailsPage
        opportunityId={selectedOpportunityId}
        onBack={() => setSelectedOpportunityId(null)}
        onSuccess={() => {
          reloadOpportunities();
          if (onSidebarOpenChange) {
            onSidebarOpenChange(true);
          }
        }}
        onOpenBooking={(opportunity) => {
          setSelectedOpportunityId(null);
          setBookingOpportunity(opportunity);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold">استثمار أشجار المزارع</h1>
                <p className="text-sm text-white/80 mt-1">
                  استثمر في الأشجار المنتجة تحت إدارة المنصة
                </p>
              </div>
            </div>

            <button
              onClick={() => onSidebarOpenChange && onSidebarOpenChange(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
              <span className="hidden sm:inline">حسابي</span>
            </button>
          </div>
        </div>
      </div>

      <OpportunityCategorySlider
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onInfoClick={() => setShowInfoModal(true)}
        availableTreeTypes={availableTreeTypes}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">جاري تحميل العروض الاستثمارية...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <TreePine className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              لا توجد عروض متاحة حاليًا
            </h3>
            <p className="text-gray-600 max-w-md">
              {selectedCategory === 'all'
                ? 'سيتم طرح فرص استثمارية جديدة قريبًا بإذن الله'
                : 'لا توجد عروض متاحة ضمن هذه الفئة. يمكنك تصفح فئة أخرى أو العودة لاحقًا'}
            </p>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-blue-700 transition-all"
              >
                عرض جميع الفئات
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {filteredOpportunities.length}
              </span>{' '}
              {filteredOpportunities.length === 1
                ? 'فرصة استثمارية متاحة'
                : 'فرص استثمارية متاحة'}
            </div>

            <div className="b2f-cards-grid">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard3D
                  key={opportunity.id}
                  opportunity={opportunity}
                  onDetailsClick={() => setSelectedOpportunityId(opportunity.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showInfoModal && (
        <InvestmentInfoModal onClose={() => setShowInfoModal(false)} />
      )}

      {sidebarOpen && (
        <InvestorSidebar
          isOpen={sidebarOpen}
          onClose={() => onSidebarOpenChange && onSidebarOpenChange(false)}
        />
      )}
    </div>
  );
}
