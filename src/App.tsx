import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useCategories } from './hooks/useCategories';
import { useAuctions } from './hooks/useAuctions';
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
import { SearchPage } from './components/SearchPage';
import { SectionTabs, type Section } from './components/SectionTabs';
import { CompanyTabs, type SubType } from './components/CompanyTabs';
import { CategorySlider } from './components/CategorySlider';
import { RegionCitySlider } from './components/RegionCitySlider';
import { AuctionCard } from './components/AuctionCard';
import { AuctionDetailsNew } from './components/AuctionDetailsNew';
import { AuctionForm } from './components/AuctionForm';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import B2FSection from './components/B2FSection';
import FarmsManagerDashboard from './components/FarmsManagerDashboard';
import FarmManagerDashboard from './components/platform/FarmManagerDashboard';
import { B2FAdminPage } from './components/platform/B2FAdminPage';
import B2BAuctionsOpsRoom from './components/platform/B2BAuctionsOpsRoom';
import B2FOperationsRoom from './components/platform/B2FOperationsRoom';
import OperationsRoomHub from './components/platform/OperationsRoomHub';
import FarmCommandCenter from './components/platform/FarmCommandCenter';
import FarmCommandOperationsRoom from './pages/FarmCommandOperationsRoom';
import FarmOperationalDashboard from './components/platform/FarmOperationalDashboard';
import SimplifiedLogin from './components/SimplifiedLogin';
import GMLoginPage from './components/platform/GMLoginPage';
import HQDashboard from './components/platform/HQDashboard';
import { usePWA } from './hooks/usePWA';
import { supabase } from './lib/supabase';
import type { Database } from './lib/database.types';

type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
type Auction = Database['public']['Tables']['auctions']['Row'];

// Feature Toggle: إخفاء مؤقت لقسم B2B للتركيز على B2F
// لإظهار B2B مرة أخرى، قم بتغيير القيمة إلى true
const SHOW_B2B_SECTION = false;

const SECTION_COLORS: Record<Section, string> = {
  companies: '#3B82F6',
  b2f: '#10B981',
};

function MainApp() {
  const { isOnline } = usePWA();
  const { regions, getCitiesByRegion, getRegionById } = useRegionsAndCities();
  const [activeSection, setActiveSection] = useState<Section>(() => {
    const saved = localStorage.getItem('lastSection');
    // إذا كان B2B مخفياً، استخدم B2F كقسم افتراضي
    if (!SHOW_B2B_SECTION && (!saved || saved === 'companies')) {
      return 'b2f';
    }
    return (saved as Section) || 'companies';
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCompanyTab, setActiveCompanyTab] = useState<SubType>('offer');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showAuctionForm, setShowAuctionForm] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [openInvestorSidebar, setOpenInvestorSidebar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    'home' | 'profile' | 'myAuctions' | 'wallet' | 'myRequests' |
    'favorites' | 'followers' | 'helpCenter' |
    'notifications' | 'settings' | 'subscriptions'
  >('home');

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
      setShowSidebar(false);
      setOpenInvestorSidebar(false);
      window.scrollTo(0, 0);
    }
    else if (page === 'profile') setCurrentPage('profile');
    else if (page === 'myAuctions') setCurrentPage('myAuctions');
    else if (page === 'wallet') setCurrentPage('wallet');
    else if (page === 'myRequests') setCurrentPage('myRequests');
    else if (page === 'favorites') setCurrentPage('favorites');
    else if (page === 'followers') setCurrentPage('followers');
    else if (page === 'helpCenter') setCurrentPage('helpCenter');
    else if (page === 'notifications') setCurrentPage('notifications');
    else if (page === 'account-settings') setCurrentPage('settings');
    else if (page === 'accountSettings') setCurrentPage('settings');
    else if (page === 'subscriptions') setCurrentPage('subscriptions');
    else if (page === 'addAuction') setShowAuctionForm(true);
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
      </div>
    );
  }

  if (currentPage === 'myRequests') {
    return (
      <div dir="rtl">
        <MyRequestsView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'favorites') {
    return (
      <div dir="rtl">
        <FavoritesView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'followers') {
    return (
      <div dir="rtl">
        <FollowersView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'helpCenter') {
    return (
      <div dir="rtl">
        <HelpCenterView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'settings') {
    return (
      <div dir="rtl">
        <AccountSettingsView onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  if (currentPage === 'notifications') {
    return (
      <div dir="rtl">
        <NotificationsView onBack={() => setCurrentPage('home')} onNavigate={handleNavigate} />
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

      <Header onNavigate={handleNavigate} />

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
        {activeSection === 'b2f' ? (
          <B2FSection
            onNavigate={handleNavigate}
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

      <Footer
        onAddAuction={() => setShowAuctionForm(true)}
        onSearchClick={() => setShowSearchPage(true)}
        onNavigate={handleNavigate}
        activeSection={activeSection}
        onB2FSidebarOpen={() => setOpenInvestorSidebar(true)}
        onMenuClick={() => {
          if (activeSection === 'b2f') {
            setCurrentPage('profile');
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
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* الواجهة العامة الكاملة - مزاد الشركات + استثمار الأشجار */}
      <Route path="/" element={<MainApp />} />

      {/* صفحة تسجيل الدخول للموظفين */}
      <Route path="/login" element={<SimplifiedLogin />} />

      {/* صفحة تسجيل الدخول للمدير العام */}
      <Route path="/gm-login" element={<GMLoginPage />} />

      {/* لوحة تحكم المدير العام - HQ Dashboard */}
      <Route path="/hq" element={<HQDashboard />} />

      {/* مسارات Admin مخفية - للموظفين فقط */}
      <Route path="/admin/farms-manager-dashboard" element={<FarmsManagerDashboard />} />
      <Route path="/admin/farm-manager-dashboard" element={<FarmManagerDashboard />} />
      <Route path="/admin/b2f" element={<B2FAdminPage />} />
      <Route path="/admin/b2f/farms/:farmId" element={<FarmOperationalDashboard />} />
      <Route path="/admin/operations-room" element={<OperationsRoomHub />} />
      <Route path="/admin/operations-room/b2f" element={<B2FOperationsRoom />} />
      <Route path="/admin/b2b-operations" element={<B2BAuctionsOpsRoom />} />
      <Route path="/admin/farm-command" element={<FarmCommandCenter />} />
      <Route path="/admin/farm-command-ops" element={<FarmCommandOperationsRoom />} />

      {/* أي مسار آخر → الواجهة العامة */}
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export default App;
