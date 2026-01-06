import { useState } from 'react';
import { useEarlyWarnings } from '../../hooks/useEarlyWarnings';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  DollarSign,
  Layers,
  Check,
  X,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function EarlyWarningPanel() {
  const { warnings, loading, detectWarnings, acknowledgeWarning, resolveWarning, dismissWarning } = useEarlyWarnings();
  const [detecting, setDetecting] = useState(false);

  const handleDetect = async () => {
    setDetecting(true);
    await detectWarnings();
    setDetecting(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'red';
      case 'critical':
        return 'orange';
      case 'warning':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'عاجل';
      case 'critical':
        return 'حرج';
      case 'warning':
        return 'تحذير';
      default:
        return 'معلومة';
    }
  };

  const getSignalTypeIcon = (signalType: string) => {
    switch (signalType) {
      case 'cluster_expense_limit':
        return <DollarSign className="w-4 h-4" />;
      case 'multiple_struggling_farms':
        return <TrendingUp className="w-4 h-4" />;
      case 'pending_decisions_accumulating':
        return <AlertCircle className="w-4 h-4" />;
      case 'cluster_bottleneck':
        return <Layers className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mr-3 text-gray-600">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">مؤشرات ضغط مبكر</h3>
            <p className="text-sm text-gray-600">تنبيهات ذكية لاتخاذ القرارات</p>
          </div>
        </div>

        <button
          onClick={handleDetect}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
          <span className="font-medium">كشف جديد</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">عاجل</p>
              <p className="text-2xl font-bold text-red-600">
                {warnings.filter(w => w.severity === 'urgent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">حرج</p>
              <p className="text-2xl font-bold text-orange-600">
                {warnings.filter(w => w.severity === 'critical').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">تحذير</p>
              <p className="text-2xl font-bold text-yellow-600">
                {warnings.filter(w => w.severity === 'warning').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">الكل</p>
              <p className="text-2xl font-bold text-gray-900">{warnings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings List */}
      {warnings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تنبيهات نشطة</h3>
          <p className="text-sm text-gray-600">جميع المؤشرات ضمن المعدلات الطبيعية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.map((warning) => {
            const severityColor = getSeverityColor(warning.severity);
            const Icon = getSignalTypeIcon(warning.signal_type);

            return (
              <div
                key={warning.id}
                className={`
                  bg-white rounded-xl border-2 transition-all
                  border-${severityColor}-200 hover:shadow-lg
                `}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg bg-${severityColor}-100 flex items-center justify-center flex-shrink-0`}>
                        {getSeverityIcon(warning.severity)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-gray-900">{warning.title}</h4>
                          <span className={`px-2 py-1 rounded-lg bg-${severityColor}-100 text-${severityColor}-700 text-xs font-bold`}>
                            {getSeverityLabel(warning.severity)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{warning.description}</p>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Layers className="w-3 h-3" />
                            <span>{warning.target_name}</span>
                          </div>

                          {warning.threshold_value && warning.current_value && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              {Icon}
                              <span>
                                {warning.current_value.toLocaleString()} / {warning.threshold_value.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const staffId = 'current-staff-id';
                          acknowledgeWarning(warning.id, staffId);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="اعتراف"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => resolveWarning(warning.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="حل"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => dismissWarning(warning.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="رفض"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {warning.threshold_value && warning.current_value && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-${severityColor}-400 to-${severityColor}-600 transition-all duration-500`}
                          style={{
                            width: `${Math.min(100, (warning.current_value / warning.threshold_value) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Note */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">ملاحظة هامة</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              التنبيهات = رؤية فقط. القرار النهائي يبقى بيدك. هذه مؤشرات تساعدك على اتخاذ قرارات مستنيرة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
