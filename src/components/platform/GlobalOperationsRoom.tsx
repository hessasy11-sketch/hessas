import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  ArrowLeft,
  AlertTriangle,
  Layers,
  RefreshCw
} from 'lucide-react';
import EarlyWarningPanel from './EarlyWarningPanel';
import ClusterMetricsPanel from './ClusterMetricsPanel';

type Tab = 'warnings' | 'clusters';

export default function GlobalOperationsRoom() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('warnings');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/admin/operations-room/hub')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">العودة</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium">تحديث</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/20">
              <Globe className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-1">غرفة العمليات العالمية</h1>
              <p className="text-blue-100 text-lg">مراقبة ومؤشرات ضغط مبكر</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setActiveTab('warnings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === 'warnings'
                  ? 'bg-white text-indigo-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              مؤشرات الضغط المبكر
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === 'clusters'
                  ? 'bg-white text-indigo-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Layers className="w-5 h-5" />
              مجموعات المزارع
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {activeTab === 'warnings' ? (
          <EarlyWarningPanel />
        ) : (
          <ClusterMetricsPanel />
        )}
      </div>
    </div>
  );
}
