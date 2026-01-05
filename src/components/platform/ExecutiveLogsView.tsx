import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Filter,
  Activity,
  Leaf,
  Building2,
  DollarSign,
  Shield,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { useExecutiveLogs, LogCategory } from '../../hooks/useExecutiveLogs';

const CATEGORY_CONFIG = {
  all: { label: 'الكل', icon: Activity, color: 'slate' },
  b2f: { label: 'استثمار المزارع', icon: Leaf, color: 'emerald' },
  b2b: { label: 'مزاد الشركات', icon: Building2, color: 'blue' },
  finance: { label: 'المالية', icon: DollarSign, color: 'amber' },
  platform: { label: 'المنصة', icon: Shield, color: 'purple' }
};

const ACTION_ICONS: Record<string, any> = {
  lock: Lock,
  unlock: Unlock,
  pause: Pause,
  resume: Play,
  extend: Clock,
  approve: CheckCircle2,
  reject: XCircle,
  create: Activity,
  update: RefreshCw,
  delete: XCircle
};

const RESULT_COLORS: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  warning: 'bg-orange-100 text-orange-700 border-orange-200'
};

export default function ExecutiveLogsView() {
  const navigate = useNavigate();
  const { logs, loading, category, loadLogs } = useExecutiveLogs();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory>('all');

  useEffect(() => {
    loadLogs(selectedCategory);
  }, [selectedCategory, loadLogs]);

  const handleCategoryChange = (cat: LogCategory) => {
    setSelectedCategory(cat);
  };

  const handleRefresh = () => {
    loadLogs(selectedCategory);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <FileText className="w-9 h-9 text-white" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  السجل القيادي
                </h1>
                <p className="text-slate-400">Executive Audit Log</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-blue-300 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-blue-200 text-sm font-medium">تحديث</span>
              </button>

              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span className="text-emerald-200 text-sm font-medium">مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">تصفية حسب القسم</h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {(Object.keys(CATEGORY_CONFIG) as LogCategory[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const Icon = config.icon;
              const isActive = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                    isActive
                      ? `bg-${config.color}-500 text-white shadow-lg`
                      : `bg-slate-100 text-slate-700 hover:bg-slate-200`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                  {isActive && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {logs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              آخر {logs.length} سجل
            </h2>
            {category !== 'all' && (
              <span className="text-sm text-slate-500">
                مُصفّى: {CATEGORY_CONFIG[category].label}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                <div className="text-slate-500">جاري التحميل...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <div className="text-slate-500">لا توجد سجلات</div>
              </div>
            ) : (
              logs.map((log) => <LogCard key={log.id} log={log} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LogCardProps {
  log: any;
}

function LogCard({ log }: LogCardProps) {
  const categoryConfig = CATEGORY_CONFIG[log.category as LogCategory] || CATEGORY_CONFIG.all;
  const CategoryIcon = categoryConfig.icon;

  const actionKey = log.action.toLowerCase().split('_')[0];
  const ActionIcon = ACTION_ICONS[actionKey] || Activity;

  const resultClass = RESULT_COLORS[log.result] || RESULT_COLORS.pending;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${categoryConfig.color}-400 to-${categoryConfig.color}-500 flex items-center justify-center flex-shrink-0`}>
          <CategoryIcon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ActionIcon className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-900">{log.action}</span>
                {log.entity_name && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700">{log.entity_name}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-3 h-3" />
                <span>{log.staff_name || 'مجهول'}</span>
                <span className="text-slate-400">•</span>
                <Clock className="w-3 h-3" />
                <span>{formatDate(log.created_at)}</span>
              </div>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${resultClass}`}>
              {log.result}
            </div>
          </div>

          {log.notes && (
            <div className="bg-slate-100 rounded-lg p-3 text-sm text-slate-700 mb-2">
              <span className="font-medium text-slate-900">الملاحظات:</span> {log.notes}
            </div>
          )}

          {log.details && Object.keys(log.details).length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-blue-900 mb-1">التفاصيل:</div>
              <div className="space-y-1 text-blue-800">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span className="font-medium">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
