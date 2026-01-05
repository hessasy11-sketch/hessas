import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OpsLiteStats {
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
  };
  maintenance: {
    total: number;
    this_month: number;
    broken_equipment: number;
  };
}

interface DailyTask {
  id: string;
  task_title: string;
  task_description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to_team_id: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
}

interface Incident {
  id: string;
  incident_title: string;
  incident_description: string | null;
  incident_type: string;
  priority: string;
  status: string;
  assigned_to_team_id: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
}

interface Maintenance {
  id: string;
  equipment_name: string;
  equipment_type: string;
  maintenance_type: string;
  maintenance_date: string;
  status_after: string;
  notes: string | null;
  cost: number | null;
  created_at: string;
}

export function useFarmOpsLite(operationalFarmId: string | null) {
  const [stats, setStats] = useState<OpsLiteStats | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operationalFarmId) {
      setLoading(false);
      return;
    }

    loadAllData();

    const channel = supabase
      .channel(`ops-lite-${operationalFarmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fc_daily_tasks',
          filter: `operational_farm_id=eq.${operationalFarmId}`
        },
        () => {
          loadTasks();
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fc_incidents',
          filter: `operational_farm_id=eq.${operationalFarmId}`
        },
        () => {
          loadIncidents();
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fc_equipment_maintenance',
          filter: `operational_farm_id=eq.${operationalFarmId}`
        },
        () => {
          loadMaintenance();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationalFarmId]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadTasks(),
      loadIncidents(),
      loadMaintenance()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!operationalFarmId) return;

    try {
      const { data, error } = await supabase.rpc('get_ops_lite_stats', {
        p_operational_farm_id: operationalFarmId
      });

      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message);
    }
  };

  const loadTasks = async () => {
    if (!operationalFarmId) return;

    try {
      const { data, error } = await supabase
        .from('fc_daily_tasks')
        .select('*')
        .eq('operational_farm_id', operationalFarmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
    }
  };

  const loadIncidents = async () => {
    if (!operationalFarmId) return;

    try {
      const { data, error } = await supabase
        .from('fc_incidents')
        .select('*')
        .eq('operational_farm_id', operationalFarmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (err: any) {
      console.error('Error loading incidents:', err);
    }
  };

  const loadMaintenance = async () => {
    if (!operationalFarmId) return;

    try {
      const { data, error } = await supabase
        .from('fc_equipment_maintenance')
        .select('*')
        .eq('operational_farm_id', operationalFarmId)
        .order('maintenance_date', { ascending: false });

      if (error) throw error;
      setMaintenance(data || []);
    } catch (err: any) {
      console.error('Error loading maintenance:', err);
    }
  };

  const createTask = async (taskData: {
    task_title: string;
    task_description?: string;
    priority?: string;
    due_date?: string;
  }) => {
    if (!operationalFarmId) return { success: false, error: 'No operational farm ID' };

    try {
      const { error } = await supabase
        .from('fc_daily_tasks')
        .insert({
          operational_farm_id: operationalFarmId,
          ...taskData
        });

      if (error) throw error;
      await loadTasks();
      await loadStats();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating task:', err);
      return { success: false, error: err.message };
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase.rpc('update_task_status', {
        p_task_id: taskId,
        p_status: status
      });

      if (error) throw error;
      await loadTasks();
      await loadStats();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating task:', err);
      return { success: false, error: err.message };
    }
  };

  const createIncident = async (incidentData: {
    incident_title: string;
    incident_description?: string;
    incident_type?: string;
    priority?: string;
  }) => {
    if (!operationalFarmId) return { success: false, error: 'No operational farm ID' };

    try {
      const { error } = await supabase
        .from('fc_incidents')
        .insert({
          operational_farm_id: operationalFarmId,
          ...incidentData
        });

      if (error) throw error;
      await loadIncidents();
      await loadStats();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating incident:', err);
      return { success: false, error: err.message };
    }
  };

  const updateIncidentStatus = async (incidentId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase.rpc('update_incident_status', {
        p_incident_id: incidentId,
        p_status: status,
        p_resolution_notes: notes || null
      });

      if (error) throw error;
      await loadIncidents();
      await loadStats();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating incident:', err);
      return { success: false, error: err.message };
    }
  };

  const createMaintenance = async (maintenanceData: {
    equipment_name: string;
    equipment_type?: string;
    maintenance_type?: string;
    status_after?: string;
    notes?: string;
    cost?: number;
  }) => {
    if (!operationalFarmId) return { success: false, error: 'No operational farm ID' };

    try {
      const { error } = await supabase
        .from('fc_equipment_maintenance')
        .insert({
          operational_farm_id: operationalFarmId,
          ...maintenanceData
        });

      if (error) throw error;
      await loadMaintenance();
      await loadStats();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating maintenance:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    stats,
    tasks,
    incidents,
    maintenance,
    loading,
    error,
    createTask,
    updateTaskStatus,
    createIncident,
    updateIncidentStatus,
    createMaintenance,
    refetch: loadAllData
  };
}
