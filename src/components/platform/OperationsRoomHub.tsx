import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Leaf, Crown } from 'lucide-react';
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

export default function OperationsRoomHub() {
  const navigate = useNavigate();
  const [b2fKPIs, setB2fKPIs] = useState<B2FKPIs | null>(null);
  const [b2bKPIs, setB2bKPIs] = useState<B2BKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
    const interval = setInterval(loadKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadKPIs = async () => {
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
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    </div>
  );
}
