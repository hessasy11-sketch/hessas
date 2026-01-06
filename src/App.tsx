import { useState, useEffect } from 'react';
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
import FarmDetailPage from './components/platform/FarmDetailPage';
import FinanceSection from './components/platform/FinanceSection';
import MarketingSection from './components/platform/MarketingSection';
import PartnersSection from './components/platform/PartnersSection';
import OperationsRoomHub from './components/platform/OperationsRoomHub';
import B2FOperationsRoom from './components/platform/B2FOperationsRoom';
import B2BAuctionsOpsRoom from './components/platform/B2BAuctionsOpsRoom';
import B2FOperationsView from './components/platform/B2FOperationsView';
import B2BOperationsView from './components/platform/B2BOperationsView';
import { AuctionsAdminPage } from './components/platform/AuctionsAdminPage';
import { B2FAdminPage } from './components/platform/B2FAdminPage';
import { SettingsAdminPage } from './components/platform/SettingsAdminPage';
import DecisionAuthoritiesView from './components/platform/DecisionAuthoritiesView';
import ExecutivePulse from './components/platform/ExecutivePulse';
import ExecutiveLogsView from './components/platform/ExecutiveLogsView';
import DecisionQueuePanel from './components/platform/DecisionQueuePanel';
import ExecutiveDecisionsLog from './components/platform/ExecutiveDecisionsLog';
import SensitiveCommandsDemo from './components/platform/SensitiveCommandsDemo';
import FarmOperationalDetail from './components/B2F/farmCommand/FarmOperationalDetail';
import FarmCommandCenter from './components/platform/FarmCommandCenter';
import FarmSetupPage from './components/platform/FarmSetupPage';
import InviteAcceptancePage from './components/platform/InviteAcceptancePage';
import CrownSmartGateway from './components/platform/CrownSmartGateway';
import GMLoginPage from './components/platform/GMLoginPage';
import MyWorkPage from './components/platform/MyWorkPage';
import TaskDetailsPage from './components/platform/TaskDetailsPage';
import GMControlPanel from './components/platform/GMControlPanel';
import StaffManagementPanel from './components/platform/StaffManagementPanel';
import ViewAsBanner from './components/platform/ViewAsBanner';
import FarmManagerDashboard from './components/platform/FarmManagerDashboard';
import { SessionGuard, DepartmentGuard, FarmScopeGuard, GatewayGuard } from './components/guards';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import { usePWA } from './hooks/usePWA';
import { supabase } from './lib/supabase';
import type { Database } from './lib/database.types';

type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
type Auction = Database['public']['Tables']['auctions']['Row'];

const SECTION_COLORS: Record<Section, string> = {
  companies: '#3B82F6',
  b2f: '#10B981',
};

function MainApp() {
  const { isOnline } = usePWA();
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

  const handleGetReloadFunction = (reloadFn: () => void) => {
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
    <ImpersonationProvider>
      <ViewAsBanner />
      <Routes>
        {/* Public route: Invite acceptance (no session required) */}
        <Route path="/admin/invite" element={<InviteAcceptancePage />} />

        {/* Crown Smart Gateway - Phase 1 */}
        <Route path="/admin/gateway" element={<CrownSmartGateway />} />

        {/* GM Login - Password Authentication */}
        <Route path="/admin/gm-login" element={<GMLoginPage />} />

        {/* GM Control Panel - Absolute Control & View-As */}
        <Route
          path="/admin/settings/gm-control"
          element={
            <GatewayGuard>
              <SessionGuard>
                <GMControlPanel />
              </SessionGuard>
            </GatewayGuard>
          }
        />

        {/* Staff Management - Create & Manage Staff */}
        <Route
          path="/admin/settings/staff"
          element={
            <GatewayGuard>
              <SessionGuard>
                <StaffManagementPanel />
              </SessionGuard>
            </GatewayGuard>
          }
        />

        {/* My Work Page - Employee Daily Hub */}
        <Route
          path="/admin/my-work"
          element={
            <GatewayGuard>
            <SessionGuard>
              <MyWorkPage />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Task Details Page - Unified for staff and farm tasks */}
      <Route
        path="/admin/tasks/:taskType/:taskId"
        element={
          <GatewayGuard>
            <SessionGuard>
              <TaskDetailsPage />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Farm Manager Dashboard */}
      <Route
        path="/admin/farm-manager-dashboard"
        element={
          <GatewayGuard>
            <SessionGuard>
              <FarmManagerDashboard />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* ============================================
          OPERATIONS ROOM ROUTES (Session + Role-based)
          ============================================ */}

      {/* General Manager / Executive Routes */}
      <Route
        path="/admin/operations-room"
        element={
          <GatewayGuard>
            <SessionGuard>
              <OperationsRoomHub />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Executive Pulse Dashboard */}
      <Route
        path="/admin/operations-room/global"
        element={
          <GatewayGuard>
            <SessionGuard>
              <ExecutivePulse />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      <Route
        path="/admin/operations-room/decisions"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DecisionQueuePanel />
            </SessionGuard>
          </GatewayGuard>
        }
      />
      <Route
        path="/admin/operations-room/executive-log"
        element={
          <GatewayGuard>
            <SessionGuard>
              <ExecutiveDecisionsLog />
            </SessionGuard>
          </GatewayGuard>
        }
      />
      <Route
        path="/admin/operations-room/logs"
        element={
          <GatewayGuard>
            <SessionGuard>
              <ExecutiveLogsView />
            </SessionGuard>
          </GatewayGuard>
        }
      />
      <Route
        path="/admin/operations-room/sensitive-commands"
        element={
          <SessionGuard>
            <SensitiveCommandsDemo />
          </SessionGuard>
        }
      />

      {/* B2F Operations Room (Department-restricted) */}
      <Route
        path="/admin/operations-room/b2f"
        element={
          <SessionGuard>
            <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
              <B2FOperationsRoom />
            </DepartmentGuard>
          </SessionGuard>
        }
      />

      {/* Farm-specific operations (Department + Farm scope) */}
      <Route
        path="/admin/operations-room/b2f/farms/:farmId"
        element={
          <SessionGuard>
            <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
              <FarmScopeGuard farmIdParam="farmId" redirectTo="/admin/b2f">
                <FarmOperationalDetail />
              </FarmScopeGuard>
            </DepartmentGuard>
          </SessionGuard>
        }
      />

      {/* B2B Operations Room (Department-restricted) */}
      <Route
        path="/admin/operations-room/b2b"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DepartmentGuard allowedDepartments={['b2b', 'B2B', 'مزادات']}>
                <B2BAuctionsOpsRoom />
              </DepartmentGuard>
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Finance, Marketing, Partners (Executive/GM only) */}
      <Route
        path="/admin/operations-room/finance"
        element={
          <GatewayGuard>
            <SessionGuard>
              <FinanceSection />
            </SessionGuard>
          </GatewayGuard>
        }
      />
      <Route
        path="/admin/operations-room/marketing"
        element={
          <GatewayGuard>
            <SessionGuard>
              <MarketingSection />
            </SessionGuard>
          </GatewayGuard>
        }
      />
      <Route
        path="/admin/operations-room/partners"
        element={
          <GatewayGuard>
            <SessionGuard>
              <PartnersSection />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* ============================================
          ADMIN SECTION ROUTES (Department-specific)
          ============================================ */}

      {/* B2B Auctions Admin (Department-restricted) */}
      <Route
        path="/admin/auctions"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DepartmentGuard allowedDepartments={['b2b', 'B2B', 'مزادات']}>
                <AuctionsAdminPage />
              </DepartmentGuard>
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* B2F Admin (Department-restricted) */}
      <Route
        path="/admin/b2f"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
                <B2FAdminPage />
              </DepartmentGuard>
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Farm Command Center (Department-restricted) */}
      <Route
        path="/admin/b2f/farm-command"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
                <FarmCommandCenter />
              </DepartmentGuard>
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Farm Detail (Department + Farm scope) */}
      <Route
        path="/admin/b2f/farm-command/farms/:farmId"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
                <FarmScopeGuard farmIdParam="farmId" redirectTo="/admin/b2f/farm-command">
                  <FarmDetailPage />
                </FarmScopeGuard>
              </DepartmentGuard>
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Farm Setup (Farm-scoped) */}
      <Route
        path="/farms/:farmId"
        element={
          <SessionGuard>
            <FarmScopeGuard farmIdParam="farmId" redirectTo="/admin/b2f">
              <FarmSetupPage />
            </FarmScopeGuard>
          </SessionGuard>
        }
      />

      {/* Admin Settings (Session required) */}
      <Route
        path="/admin/settings"
        element={
          <GatewayGuard>
            <SessionGuard>
              <SettingsAdminPage />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* Decision Authorities (Session required) */}
      <Route
        path="/admin/settings/authority"
        element={
          <GatewayGuard>
            <SessionGuard>
              <DecisionAuthoritiesView />
            </SessionGuard>
          </GatewayGuard>
        }
      />

      {/* ============================================
          HQ ROUTES (Alias for Operations Room)
          ============================================ */}
      <Route
        path="/hq"
        element={
          <SessionGuard>
            <OperationsRoomHub />
          </SessionGuard>
        }
      />
      <Route
        path="/hq/*"
        element={
          <SessionGuard>
            <OperationsRoomHub />
          </SessionGuard>
        }
      />

      {/* ============================================
          PUBLIC ROUTES (No protection)
          ============================================ */}
      <Route path="*" element={<MainApp />} />
    </Routes>
    </ImpersonationProvider>
  );
}

export default App;
