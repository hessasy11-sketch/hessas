import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SeasonHeader } from './SeasonHeader';
import { PhaseTimeline } from './PhaseTimeline';
import {
  AgriculturalOperationsTab,
  OperationalExpensesTab,
  HarvestAndProcessingTab,
  FilesAndReportsTab,
  InvestorsTab,
  VisitRequestsTab
} from './SeasonTabs';

interface SeasonManagementViewProps {
  seasonId: string;
  farmName: string;
  onBack: () => void;
}

interface Season {
  id: string;
  season_name: string;
  season_year: number;
  season_type: string;
  status: string;
}

interface Phase {
  id: string;
  phase_type: string;
  phase_number: number;
  status: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

type TabType = 'operations' | 'expenses' | 'harvest' | 'files' | 'investors' | 'visits';

export function SeasonManagementView({ seasonId, farmName, onBack }: SeasonManagementViewProps) {
  const [season, setSeason] = useState<Season | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('operations');

  const [treesCount, setTreesCount] = useState(0);
  const [investorsCount, setInvestorsCount] = useState(0);

  useEffect(() => {
    loadSeasonData();
  }, [seasonId]);

  const loadSeasonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load season info
      const { data: seasonData, error: seasonError } = await supabase
        .from('farm_seasons')
        .select('*')
        .eq('id', seasonId)
        .single();

      if (seasonError) throw seasonError;
      setSeason(seasonData);

      // Load phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('season_phases')
        .select('*')
        .eq('season_id', seasonId)
        .order('phase_number', { ascending: true });

      if (phasesError) throw phasesError;
      setPhases(phasesData || []);

      // Calculate trees count
      const { data: treesData } = await supabase.rpc('count_trees_in_season', {
        p_season_id: seasonId
      });
      setTreesCount(treesData || 0);

      // Calculate investors count
      const { data: investorsData } = await supabase.rpc('count_investors_in_season', {
        p_season_id: seasonId
      });
      setInvestorsCount(investorsData || 0);

    } catch (err) {
      console.error('Error loading season data:', err);
      setError('حدث خطأ أثناء تحميل بيانات الموسم');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPhase = () => {
    const inProgress = phases.find(p => p.status === 'in_progress');
    if (inProgress) return inProgress.phase_type;

    const notStarted = phases.find(p => p.status === 'not_started');
    if (notStarted) return notStarted.phase_type;

    return 'delivery'; // All completed
  };

  const calculateProgress = () => {
    if (phases.length === 0) return 0;
    const completedCount = phases.filter(p => p.status === 'completed').length;
    return Math.round((completedCount / phases.length) * 100);
  };

  const tabs = [
    { id: 'operations', label: 'العمليات الزراعية', icon: '🌱' },
    { id: 'expenses', label: 'المصاريف التشغيلية', icon: '💰' },
    { id: 'harvest', label: 'الحصاد والعصر', icon: '📦' },
    { id: 'files', label: 'الملفات والتقارير', icon: '📄' },
    { id: 'investors', label: 'المستثمرون', icon: '👥' },
    { id: 'visits', label: 'طلبات الزيارة', icon: '📍' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات الموسم...</p>
        </div>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ</h3>
          <p className="text-gray-600 mb-4">{error || 'لم يتم العثور على الموسم'}</p>
          <button
            onClick={loadSeasonData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-green-600 mb-4 transition-colors"
      >
        <ArrowRight className="w-5 h-5" />
        <span className="font-medium">العودة لقائمة المواسم</span>
      </button>

      {/* Season Header */}
      <SeasonHeader
        farmName={farmName}
        seasonName={season.season_name}
        seasonYear={season.season_year}
        seasonType={season.season_type}
        treesCount={treesCount}
        investorsCount={investorsCount}
        currentPhase={getCurrentPhase()}
        progress={calculateProgress()}
      />

      {/* Phase Timeline */}
      <PhaseTimeline
        seasonId={seasonId}
        phases={phases}
        onPhasesUpdate={loadSeasonData}
      />

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border-2 border-gray-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 min-w-[150px] px-6 py-4 font-semibold text-sm transition-all duration-300 border-b-4 ${
                activeTab === tab.id
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-transparent hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'operations' && <AgriculturalOperationsTab seasonId={seasonId} />}
        {activeTab === 'expenses' && <OperationalExpensesTab seasonId={seasonId} />}
        {activeTab === 'harvest' && <HarvestAndProcessingTab seasonId={seasonId} />}
        {activeTab === 'files' && <FilesAndReportsTab seasonId={seasonId} />}
        {activeTab === 'investors' && <InvestorsTab seasonId={seasonId} />}
        {activeTab === 'visits' && <VisitRequestsTab seasonId={seasonId} />}
      </div>
    </div>
  );
}
