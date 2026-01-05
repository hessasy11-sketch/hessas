import { useNavigate } from 'react-router-dom';
import { Building2, Gavel, ArrowRight } from 'lucide-react';

export default function OperationsRoomHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            غرفة العمليات التنفيذية
          </h1>
          <p className="text-slate-400 text-lg">
            اختر القسم المطلوب
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <OperationCard
            icon={Building2}
            title="غرفة عمليات B2F"
            description="إدارة عمليات استثمار المزارع"
            color="from-emerald-500 to-teal-600"
            onClick={() => navigate('/admin/operations-room/b2f')}
          />

          <OperationCard
            icon={Gavel}
            title="غرفة عمليات B2B"
            description="إدارة عمليات مزاد الشركات"
            color="from-blue-500 to-indigo-600"
            onClick={() => navigate('/admin/operations-room/b2b')}
          />
        </div>
      </div>
    </div>
  );
}

interface OperationCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

function OperationCard({ icon: Icon, title, description, color, onClick }: OperationCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:scale-105 text-right"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />

      <div className="relative">
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 mr-auto`}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">
          {title}
        </h3>

        <p className="text-slate-400 mb-6">
          {description}
        </p>

        <div className="flex items-center justify-end text-slate-300 group-hover:text-white transition-colors">
          <span className="font-semibold ml-2">دخول</span>
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
}
