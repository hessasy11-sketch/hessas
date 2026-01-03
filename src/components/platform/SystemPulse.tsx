import { Activity, CheckCircle, AlertTriangle, XCircle, FileText, Headphones } from 'lucide-react';

interface PulseData {
  operations_status: 'stable' | 'pressure' | 'error' | 'inactive';
  operations_label: string;
  documentation: {
    count: number;
    label: string;
  };
  service: {
    count: number;
    label: string;
  };
}

interface Props {
  data: PulseData;
}

export default function SystemPulse({ data }: Props) {
  const operationsConfig = {
    stable: {
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      label: 'مستقر'
    },
    pressure: {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      label: 'ضغط'
    },
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'خلل'
    },
    inactive: {
      icon: Activity,
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      label: 'غير مفعل'
    }
  };

  const config = operationsConfig[data.operations_status];
  const OperationIcon = config.icon;

  return (
    <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-2 border-slate-200 rounded-xl p-6">
      {/* العنوان */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">النبض العام للمنصة</h3>
      </div>

      {/* المؤشرات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* حالة التشغيل */}
        <div className={`${config.bgColor} rounded-lg p-4 border-2 ${config.bgColor === 'bg-gray-50' ? 'border-gray-200' : 'border-transparent'}`}>
          <div className="flex items-center gap-2 mb-2">
            <OperationIcon className={`w-5 h-5 ${config.color}`} />
            <span className="text-sm font-semibold text-gray-700">التشغيل</span>
          </div>
          <p className={`text-lg font-bold ${config.color}`}>
            {data.operations_label}
          </p>
        </div>

        {/* التوثيق */}
        <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">التوثيق</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {data.documentation.label}
          </p>
        </div>

        {/* خدمة المستثمر */}
        <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">خدمة المستثمر</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {data.service.label}
          </p>
        </div>
      </div>
    </div>
  );
}
