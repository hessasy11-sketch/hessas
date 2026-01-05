import { useState, useEffect } from 'react';
import { Wrench, Plus, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MaintenanceLog {
  id: string;
  maintenance_type: string;
  title: string;
  scheduled_date: string;
  actual_date: string;
  status: string;
  outcome: string;
  cost: number;
  equipment: { equipment_name: string } | null;
}

export default function MaintenanceLogView({ farmId }: { farmId: string }) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [farmId]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('fc_maintenance_log')
        .select(`
          *,
          equipment:fc_equipment(equipment_name)
        `)
        .eq('farm_id', farmId)
        .order('actual_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      preventive: 'وقائية',
      corrective: 'تصحيحية',
      predictive: 'تنبؤية',
      emergency: 'طوارئ'
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.scheduled;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          إجمالي السجلات: {logs.length}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />
          سجل صيانة جديد
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد سجلات صيانة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{log.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{getTypeLabel(log.maintenance_type)}</span>
                    {log.equipment && <span>• {log.equipment.equipment_name}</span>}
                    {log.actual_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(log.actual_date).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                    {log.cost && <span>• التكلفة: {log.cost} ريال</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
