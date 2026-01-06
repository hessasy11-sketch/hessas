import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Leaf, Crown, CheckCircle2, Clock, AlertCircle, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import GatewayCard from './GatewayCard';

interface B2FKPIs {
  pending_decisions: number;
  active_farms: number;
  critical_alerts: number;
}

interface B2BKPIs {
  pending_decisions: number;
  active_auctions: number;
  critical_issues: number;
}

interface Decision {
  id: string;
  source: 'b2f' | 'b2b';
  decision_type: string;
  title: string;
  priority: string;
  requested_by: string;
  requester_name: string;
  created_at: string;
  context: any;
}

export default function OperationsRoomHub() {
  const navigate = useNavigate();
  const [b2fKPIs, setB2fKPIs] = useState<B2FKPIs | null>(null);
  const [b2bKPIs, setB2bKPIs] = useState<B2BKPIs | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<'all' | 'b2f' | 'b2b'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // B2F KPIs
      const { data: b2fData } = await supabase.rpc('get_b2f_gateway_kpis');
      if (b2fData) {
        setB2fKPIs(b2fData);
      }

      // B2B KPIs
      const { data: b2bData } = await supabase.rpc('get_b2b_gateway_kpis');
      if (b2bData) {
        setB2bKPIs(b2bData);
      }

      // Load all pending decisions
      const { data: decisionsData } = await supabase.rpc('get_all_pending_decisions_for_gm');
      if (decisionsData) {
        setDecisions(decisionsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDecisions = filter === 'all'
    ? decisions
    : decisions.filter(d => d.source === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
              <Crown className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                غرفة العمليات التنفيذية
              </h1>
              <p className="text-slate-400">Executive Operations Room - GM Gateway</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Cards - 2 Cards Only */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* B2F Command Card */}
          <GatewayCard
            title="استثمار المزارع"
            subtitle="Farm Investment Command Center"
            icon={Leaf}
            iconGradient="from-emerald-500 to-emerald-600"
            borderColor="border-emerald-200 hover:border-emerald-300"
            kpis={[
              {
                label: 'قرارات معلقة',
                value: b2fKPIs?.pending_decisions || 0,
                loading: loading
              },
              {
                label: 'مزارع نشطة',
                value: b2fKPIs?.active_farms || 0,
                loading: loading
              },
              {
                label: 'تنبيهات حرجة',
                value: b2fKPIs?.critical_alerts || 0,
                loading: loading
              }
            ]}
            onEnter={() => navigate('/admin/operations-room/b2f')}
            loading={loading}
          />

          {/* B2B Command Card */}
          <GatewayCard
            title="مزاد الشركات"
            subtitle="Business Auctions Command Center"
            icon={Building2}
            iconGradient="from-blue-500 to-blue-600"
            borderColor="border-blue-200 hover:border-blue-300"
            kpis={[
              {
                label: 'قرارات معلقة',
                value: b2bKPIs?.pending_decisions || 0,
                loading: loading
              },
              {
                label: 'مزادات نشطة',
                value: b2bKPIs?.active_auctions || 0,
                loading: loading
              },
              {
                label: 'مشاكل حرجة',
                value: b2bKPIs?.critical_issues || 0,
                loading: loading
              }
            ]}
            onEnter={() => navigate('/admin/operations-room/b2b')}
            loading={loading}
          />
        </div>

        {/* Decision Queue Section */}
        <div className="mt-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      قرارات بانتظار اعتماد المدير العام
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Decisions Pending General Manager Approval
                    </p>
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    الكل ({decisions.length})
                  </button>
                  <button
                    onClick={() => setFilter('b2f')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'b2f'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    مزارع ({decisions.filter(d => d.source === 'b2f').length})
                  </button>
                  <button
                    onClick={() => setFilter('b2b')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'b2b'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    مزادات ({decisions.filter(d => d.source === 'b2b').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Decisions List */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                  <p className="text-slate-600 mt-3">جاري التحميل...</p>
                </div>
              ) : filteredDecisions.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    لا توجد قرارات معلقة
                  </h3>
                  <p className="text-slate-600">
                    جميع القرارات تم اعتمادها أو لا يوجد قرارات جديدة
                  </p>
                </div>
              ) : (
                filteredDecisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Decision Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Source Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              decision.source === 'b2f'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {decision.source === 'b2f' ? 'مزارع' : 'مزادات'}
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              decision.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : decision.priority === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {decision.priority === 'urgent'
                              ? 'عاجل'
                              : decision.priority === 'high'
                              ? 'مرتفع'
                              : decision.priority === 'normal'
                              ? 'عادي'
                              : 'منخفض'}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 mb-1">
                          {decision.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {new Date(decision.created_at).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>•</span>
                          <span>بواسطة: {decision.requester_name}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium">
                          اعتماد
                        </button>
                        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
