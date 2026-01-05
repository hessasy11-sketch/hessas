import { useState, useEffect } from 'react';
import { Clipboard, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  serial_number: string;
  current_status: string;
  warranty_expiry: string;
  assigned_team: { team_name: string } | null;
}

export default function EquipmentView({ farmId }: { farmId: string }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipment();
  }, [farmId]);

  const loadEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('fc_equipment')
        .select(`
          *,
          assigned_team:fc_farm_teams(team_name)
        `)
        .eq('farm_id', farmId)
        .order('equipment_name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-green-100 text-green-700',
      under_maintenance: 'bg-yellow-100 text-yellow-700',
      broken: 'bg-red-100 text-red-700',
      retired: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.operational;
  };

  const getStatusIcon = (status: string) => {
    return status === 'operational' ? CheckCircle : AlertCircle;
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      vehicle: 'مركبة',
      tool: 'أداة',
      machine: 'آلة',
      irrigation: 'ري',
      other: 'أخرى'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          إجمالي المعدات: {equipment.length}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
          <Plus className="w-4 h-4" />
          معدات جديدة
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد معدات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => {
            const StatusIcon = getStatusIcon(item.current_status);

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusIcon
                    className={`w-6 h-6 ${
                      item.current_status === 'operational' ? 'text-green-500' : 'text-red-500'
                    }`}
                  />
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.current_status)}`}>
                    {item.current_status}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{item.equipment_name}</h3>

                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>النوع:</span>
                    <span className="font-medium">{getTypeLabel(item.equipment_type)}</span>
                  </div>
                  {item.serial_number && (
                    <div className="flex justify-between">
                      <span>الرقم التسلسلي:</span>
                      <span className="font-mono text-xs">{item.serial_number}</span>
                    </div>
                  )}
                  {item.assigned_team && (
                    <div className="flex justify-between">
                      <span>الفريق:</span>
                      <span className="font-medium">{item.assigned_team.team_name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
