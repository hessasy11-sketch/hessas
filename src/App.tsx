import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InvestorAuthProvider, useInvestorAuth } from './contexts/InvestorAuthContext';
import { useCategories } from './hooks/useCategories';
import { useAuctions } from './hooks/useAuctions';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { useRegionsAndCities } from './hooks/useRegionsAndCities';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { UserProfile } from './components/UserProfile';
import { MyAuctionsView } from './components/MyAuctionsView';
import { WalletView } from './components/WalletView';
import { MyRequestsView } from './components/MyRequestsView';
import { FavoritesView } from './components/FavoritesView';
import { FollowersView } from './components/FollowersView';
import { HelpCenterView } from './components/HelpCenterView';
import { NotificationsView } from './components/NotificationsView';
import { AccountSettingsView } from './components/AccountSettingsView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AdminDashboard } from './components/AdminDashboard';
import { PlanDetailsView } from './components/PlanDetailsView';
import { SignupFlow } from './components/SignupFlow';
import { SearchPage } from './components/SearchPage';
import { SectionTabs, type Section } from './components/SectionTabs';
import { CompanyTabs, type SubType } from './components/CompanyTabs';
import { CategorySlider } from './components/CategorySlider';
import { RegionCitySlider } from './components/RegionCitySlider';
import { AuctionCard } from './components/AuctionCard';
import { AuctionDetailsNew } from './components/AuctionDetailsNew';
import { AuctionForm } from './components/AuctionForm';
import { NotificationToast } from './components/NotificationToast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { SubscriptionExpiryAlert } from './components/SubscriptionExpiryAlert';
import { PromotionalOfferModal } from './components/PromotionalOfferModal';
import { TrialCountdownBanner } from './components/TrialCountdownBanner';
import { TrialExpiryNotification } from './components/TrialExpiryNotification';
import B2FSection from './components/B2FSection';
import B2FControlPanel from './components/B2F/B2FControlPanel';
import { EnhancedAuctionsManagement } from './components/EnhancedAuctionsManagement';
import PlatformCommandCenterV2 from './components/platform/PlatformCommandCenterV2';
import { usePWA } from './hooks/usePWA';
import { usePromotionalOffer } from './hooks/usePromotionalOffer';
import { useDynamicPlans } from './hooks/useDynamicPlans';
import { supabase } from './lib/supabase';
import type { Database } from './lib/database.types';

type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
type Auction = Database['public']['Tables']['auctions']['Row'];

const SECTION_COLORS: Record<Section, string> = {
  companies: '#3B82F6',
  b2f: '#10B981',
};

function MainApp() {
  const { user, profile } = useAuth();
  const { user: investorUser, account: investorAccount } = useInvestorAuth();
  const { isOnline } = usePWA();
  const { hasActiveOffer } = usePromotionalOffer(user?.id);
  const { regions, getCitiesByRegion, getRegionById } = useRegionsAndCities();
  const [activeSection, setActiveSection] = useState<Section>(() => {
    const saved = localStorage.getItem('lastSection');
    return (saved as Section) || 'companies';
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCompanyTab, setActiveCompanyTab] = useState<SubType>('offer');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showAuctionForm, setShowAuctionForm] = useState(false);
  const [showSignupFlow, setShowSignupFlow] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [showPromotionalOffer, setShowPromotionalOffer] = useState(false);
  const [showTrialNotification, setShowTrialNotification] = useState(true);
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [openInvestorSidebar, setOpenInvestorSidebar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    'home' | 'profile' | 'myAuctions' | 'wallet' | 'myRequests' |
    'favorites' | 'followers' | 'planDetails' | 'helpCenter' |
    'notifications' | 'settings' | 'adminDashboard' | 'subscriptions' | 'b2fAdmin' | 'b2bAdmin'
  >('home');

  const { notifications, removeNotification } = useRealtimeNotifications(user?.id);
  const { plans: dynamicPlans, userStatus } = useDynamicPlans();

  const { categories } = useCategories(
    activeSection,
    activeSection === 'companies' ? activeCompanyTab : null
  );

  const { auctions } = useAuctions(
    activeSection,
    activeCategory || undefined,
    activeSection === 'companies' ? activeCompanyTab : undefined,
    undefined,
    selectedRegionId,
    selectedCityIds
  );

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    setActiveCategory(null);
    setSelectedRegionId(null);
    setSelectedCityIds([]);
    setActiveCompanyTab('offer');
    localStorage.setItem('lastSection', section);
  };

  const handleGetReloadFunction = (reloadFn: () => void) => {
    // Store reload function if needed
  };

  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegionId(regionId);
    setSelectedCityIds([]);
  };

  const handleCitiesSelect = (cityIds: string[]) => {
    setSelectedCityIds(cityIds);
  };

  const handleAddAuction = async (auction: AuctionInsert) => {
    const { error } = await supabase.from('auctions').insert(auction);
    if (error) {
      console.error('Error creating auction:', error);
      throw error;
    }
  };

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      setCurrentPage('home');
      // إغلاق أي sidebars مفتوحة
      setShowSidebar(false);
      setOpenInvestorSidebar(false);
      // إعادة التمرير لأعلى الصفحة
      window.scrollTo(0, 0);
    }
    else if (page === 'profile') setCurrentPage('profile');
    else if (page === 'myAuctions') setCurrentPage('myAuctions');
    else if (page === 'wallet') setCurrentPage('wallet');
    else if (page === 'myRequests') setCurrentPage('myRequests');
    else if (page === 'favorites') setCurrentPage('favorites');
    else if (page === 'followers') setCurrentPage('followers');
    else if (page === 'operations') setCurrentPage('operations');
    else if (page.startsWith('planDetails:')) {
      const planId = page.split(':')[1];
      setSelectedPlanId(planId);
      setCurrentPage('planDetails');
    }
    else if (page === 'helpCenter') setCurrentPage('helpCenter');
    else if (page === 'notifications') setCurrentPage('notifications');
    else if (page === 'account-settings') setCurrentPage('settings');
    else if (page === 'accountSettings') setCurrentPage('settings');
    else if (page === 'subscriptions') setCurrentPage('subscriptions');
    else if (page === 'adminDashboard') {
      setCurrentPage('adminDashboard');
    }
    else if (page === 'b2fAdmin') {
      setCurrentPage('b2fAdmin');
    }
    else if (page === 'b2bAdmin') {
      setCurrentPage('b2bAdmin');
    }
    else if (page === 'platformCommand') {
      setShowCommandCenter(true);
    }
    else if (page === 'addAuction') setShowAuctionForm(true);
    else if (page === 'signup') {
      setShowSignupFlow(true);
    }
  };

  const sectionColor = SECTION_COLORS[activeSection];

  if (currentPage === 'profile') {
    return (
      <div dir="rtl">
        <UserProfile
          onBack={() => setCurrentPage('home')}
          onViewMyAuctions={() => setCurrentPage('myAuctions')}
          onManageAccount={() => setCurrentPage('settings')}
        />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'myAuctions') {
    return (
      <div dir="rtl">
        <MyAuctionsView
          onBack={() => setCurrentPage('home')}
          onAddAuction={() => setShowAuctionForm(true)}
        />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'wallet') {
    return (
      <div dir="rtl">
        <WalletView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'myRequests') {
    return (
      <div dir="rtl">
        <MyRequestsView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'favorites') {
    return (
      <div dir="rtl">
        <FavoritesView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'followers') {
    return (
      <div dir="rtl">
        <FollowersView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'planDetails' && selectedPlanId) {
    const selectedPlan = dynamicPlans.find(p => p.id === selectedPlanId);

    if (!selectedPlan) {
      setCurrentPage('home');
      return null;
    }

    return (
      <PlanDetailsView
        plan={selectedPlan}
        userStatus={userStatus}
        onBack={() => {
          setCurrentPage('home');
          setSelectedPlanId(null);
        }}
      />
    );
  }

  if (currentPage === 'helpCenter') {
    return (
      <div dir="rtl">
        <HelpCenterView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'adminDashboard') {
    return (
      <div dir="rtl">
        <AdminDashboard />
      </div>
    );
  }

  if (currentPage === 'b2fAdmin') {
    return (
      <div dir="rtl">
        <B2FControlPanel onClose={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'b2bAdmin') {
    return (
      <div dir="rtl">
        <EnhancedAuctionsManagement onClose={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div dir="rtl">
        <AccountSettingsView onBack={() => setCurrentPage('home')} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'notifications') {
    return (
      <div dir="rtl">
        <NotificationsView onBack={() => setCurrentPage('home')} onNavigate={handleNavigate} />

        {showAuctionForm && (
          <AuctionForm
            section={activeSection}
            categoryId={activeCategory || undefined}
            auctionType={undefined}
            onSubmit={handleAddAuction}
            onCancel={() => setShowAuctionForm(false)}
          />
        )}
      </div>
    );
  }

  if (currentPage === 'subscriptions') {
    return (
      <div dir="rtl">
        <SubscriptionsView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-bold z-[1000]">
          ⚠️ لا يوجد اتصال بالإنترنت - تعمل في وضع عدم الاتصال
        </div>
      )}
      <PWAInstallPrompt />
      {user && <SubscriptionExpiryAlert userId={user.id} />}
      {user && hasActiveOffer && (
        <PromotionalOfferModal
          userId={user.id}
          onAccept={(offerId, planId) => {
            setShowPromotionalOffer(false);
            setCurrentPage('subscriptions');
          }}
          onClose={() => setShowPromotionalOffer(false)}
        />
      )}
      <Header
        onNavigate={handleNavigate}
      />

      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onNavigate={handleNavigate}
        currentSection={activeSection}
      />

      <div className="pt-16 sm:pt-20 md:pt-24">
        <SectionTabs
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-1.5 pb-24 md:pb-8 flex-1 w-full">
        {userStatus && userStatus.is_on_trial && userStatus.days_remaining && (
          <div className="mb-1.5">
            <TrialCountdownBanner
              userStatus={userStatus}
              onUpgrade={() => {
                const currentPlan = dynamicPlans.find(p => p.plan_type === userStatus.current_plan_type);
                if (currentPlan) {
                  setSelectedPlanId(currentPlan.id);
                  setCurrentPage('planDetails');
                }
              }}
            />
          </div>
        )}

        {activeSection === 'b2f' ? (
          <B2FSection
            onNavigate={handleNavigate}
            onGetReloadFunction={handleGetReloadFunction}
            sidebarOpen={openInvestorSidebar}
            onSidebarOpenChange={setOpenInvestorSidebar}
          />
        ) : (
          <>
            {activeSection === 'companies' && (
              <CompanyTabs
                activeTab={activeCompanyTab}
                onTabChange={(tab) => {
                  setActiveCompanyTab(tab);
                  setActiveCategory(null);
                }}
              />
            )}

            <CategorySlider
              categories={categories}
              activeCategory={activeCategory}
              onCategorySelect={setActiveCategory}
              sectionColor={sectionColor}
            />

            {activeSection === 'companies' && (
              <RegionCitySlider
                regions={regions}
                cities={[]}
                selectedRegionId={selectedRegionId}
                selectedCityIds={selectedCityIds}
                onSelectRegion={handleRegionSelect}
                onSelectCities={handleCitiesSelect}
                getCitiesByRegion={getCitiesByRegion}
                getRegionById={getRegionById}
              />
            )}

            <div className="mt-1.5">
              {auctions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {auctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onClick={() => setSelectedAuction(auction)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <div className="text-5xl sm:text-6xl mb-3">📦</div>
                  <p className="text-gray-500 text-base sm:text-lg">
                    لا توجد مزادات في هذا القسم حالياً
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <NotificationToast
        notifications={notifications}
        onRemove={removeNotification}
      />

      <Footer
        onAddAuction={() => setShowAuctionForm(true)}
        onSearchClick={() => setShowSearchPage(true)}
        onNavigate={handleNavigate}
        activeSection={activeSection}
        onB2FSidebarOpen={() => setOpenInvestorSidebar(true)}
        onMenuClick={() => {
          if (activeSection === 'b2f') {
            if (user) {
              setCurrentPage('profile');
            } else {
              setShowSignupFlow(true);
            }
          } else {
            setShowSidebar(true);
          }
        }}
      />

      {showSearchPage && (
        <SearchPage
          onClose={() => setShowSearchPage(false)}
          onAuctionClick={(auction) => {
            setSelectedAuction(auction);
            setShowSearchPage(false);
            setCurrentPage('home');
          }}
        />
      )}

      {selectedAuction && (
        <AuctionDetailsNew
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
        />
      )}

      {showAuctionForm && (
        <AuctionForm
          section={activeSection}
          categoryId={activeCategory || undefined}
          auctionType={undefined}
          onSubmit={handleAddAuction}
          onCancel={() => setShowAuctionForm(false)}
        />
      )}

      {userStatus && userStatus.is_on_trial && userStatus.days_remaining && userStatus.days_remaining <= 2 && showTrialNotification && (
        <TrialExpiryNotification
          userStatus={userStatus}
          onClose={() => setShowTrialNotification(false)}
          onUpgrade={() => {
            setShowTrialNotification(false);
            const currentPlan = dynamicPlans.find(p => p.plan_type === userStatus.current_plan_type);
            if (currentPlan) {
              setSelectedPlanId(currentPlan.id);
              setCurrentPage('planDetails');
            }
          }}
        />
      )}

      {showSignupFlow && (
        <SignupFlow
          onClose={() => setShowSignupFlow(false)}
          onComplete={(userData) => {
            console.log('Account created:', userData);
            setShowSignupFlow(false);
            setCurrentPage('home');
          }}
        />
      )}

      {showCommandCenter && (
        <PlatformCommandCenterV2
          onClose={() => setShowCommandCenter(false)}
          onNavigateToB2F={() => {
            setShowCommandCenter(false);
            setCurrentPage('b2fAdmin');
          }}
          onNavigateToAuctions={() => {
            setShowCommandCenter(false);
            setCurrentPage('b2bAdmin');
          }}
        />
      )}

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <InvestorAuthProvider>
        <MainApp />
      </InvestorAuthProvider>
    </AuthProvider>
  );
}

export default App;
