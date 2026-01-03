import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Phase {
  id: string;
  phase_type: string;
  phase_number: number;
  status: 'not_started' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  notes?: string;
}

interface PhaseTimelineProps {
  seasonId: string;
  phases: Phase[];
  onPhasesUpdate: () => void;
}

export function PhaseTimeline({ seasonId, phases, onPhasesUpdate }: PhaseTimelineProps) {
  const [updating, setUpdating] = useState(false);

  const phaseInfo: Record<string, { label: string; icon: string }> = {
    'activation': { label: 'تفعيل التشغيل', icon: '🟢' },
    'growth': { label: 'مرحلة النمو', icon: '🌱' },
    'irrigation': { label: 'مرحلة الري المبرمج', icon: '💧' },
    'care': { label: 'العناية الزراعية', icon: '🌿' },
    'production': { label: 'مرحلة الإنتاج', icon: '🍈' },
    'pre_harvest': { label: 'ما قبل الحصاد', icon: '🟡' },
    'harvest': { label: 'جني الثمار', icon: '🫒' },
    'accounting': { label: 'حسم الكميات والمصاريف', icon: '⚙️' },
    'processing': { label: 'العصر والتغليف', icon: '🟣' },
    'delivery': { label: 'تسليم المنتج وإغلاق الموسم', icon: '📦' }
  };

  const handleStatusChange = async (phaseId: string, newStatus: string) => {
    if (updating) return;

    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus
      };

      // إذا تم تفعيل المرحلة، أضف تاريخ البدء
      if (newStatus === 'in_progress' && !phases.find(p => p.id === phaseId)?.start_date) {
        updateData.start_date = new Date().toISOString();
      }

      // إذا تم إكمال المرحلة، أضف تاريخ الانتهاء
      if (newStatus === 'completed') {
        updateData.end_date = new Date().toISOString();
        if (!phases.find(p => p.id === phaseId)?.start_date) {
          updateData.start_date = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('season_phases')
        .update(updateData)
        .eq('id', phaseId);

      if (error) throw error;

      onPhasesUpdate();
    } catch (error) {
      console.error('Error updating phase:', error);
      alert('حدث خطأ أثناء تحديث المرحلة');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-orange-600" />;
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'in_progress':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--/--/----';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const sortedPhases = [...phases].sort((a, b) => a.phase_number - b.phase_number);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-green-600" />
        <span>مراحل الموسم</span>
      </h2>

      <div className="space-y-4">
        {sortedPhases.map((phase, index) => {
          const info = phaseInfo[phase.phase_type] || { label: phase.phase_type, icon: '⭐' };

          return (
            <div
              key={phase.id}
              className={`relative border-2 rounded-xl p-4 transition-all duration-300 ${getStatusColor(phase.status)}`}
            >
              {/* Connection Line */}
              {index < sortedPhases.length - 1 && (
                <div className="absolute right-[30px] top-full w-0.5 h-4 bg-gray-300" />
              )}

              <div className="flex items-center gap-4">
                {/* Phase Number and Icon */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-current flex items-center justify-center font-bold text-lg">
                    {phase.phase_number}
                  </div>
                  <span className="text-2xl">{info.icon}</span>
                </div>

                {/* Phase Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(phase.status)}
                    <h3 className="text-lg font-bold text-gray-900">{info.label}</h3>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>بدأت:</span>
                      <span className="font-semibold">{formatDate(phase.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>انتهت:</span>
                      <span className="font-semibold">{formatDate(phase.end_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(phase.id, 'not_started')}
                    disabled={updating || phase.status === 'not_started'}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      phase.status === 'not_started'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    لم تبدأ
                  </button>
                  <button
                    onClick={() => handleStatusChange(phase.id, 'in_progress')}
                    disabled={updating || phase.status === 'in_progress'}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      phase.status === 'in_progress'
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                    } disabled:opacity-50`}
                  >
                    جارية
                  </button>
                  <button
                    onClick={() => handleStatusChange(phase.id, 'completed')}
                    disabled={updating || phase.status === 'completed'}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      phase.status === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    } disabled:opacity-50`}
                  >
                    مكتملة
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
