import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OperationalFarm {
  operational_farm_id: string;
  operational_status: string;
  farm_manager_id: string | null;
  farm_manager_name: string | null;
  readiness_score: number;
  teams_count: number;
  members_count: number;
}

interface FarmTeam {
  id: string;
  team_name: string;
  team_role: string;
  team_leader_id: string | null;
  team_leader_name: string | null;
  members_count: number;
  is_active: boolean;
}

export function useFarmSetup(farmId: string | null) {
  const [operationalFarm, setOperationalFarm] = useState<OperationalFarm | null>(null);
  const [teams, setTeams] = useState<FarmTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    loadFarmData();

    const channel = supabase
      .channel(`farm-setup-${farmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fc_operational_farms',
          filter: `farm_id=eq.${farmId}`
        },
        () => {
          loadFarmData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fc_farm_teams'
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId]);

  const loadFarmData = async () => {
    if (!farmId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        'get_operational_farm_for_farm',
        { p_farm_id: farmId }
      );

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setOperationalFarm(data[0]);
        await loadTeams();
      } else {
        setOperationalFarm(null);
      }
    } catch (err: any) {
      console.error('Error loading farm data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    if (!farmId) return;

    try {
      const { data: opFarm } = await supabase
        .from('fc_operational_farms')
        .select('id')
        .eq('farm_id', farmId)
        .maybeSingle();

      if (!opFarm) return;

      const { data: teamsData, error: teamsError } = await supabase
        .from('fc_farm_teams')
        .select(`
          id,
          team_name,
          team_role,
          team_leader_id,
          is_active,
          team_leader:platform_staff!team_leader_id(name_ar)
        `)
        .eq('operational_farm_id', opFarm.id)
        .order('created_at');

      if (teamsError) throw teamsError;

      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const { count } = await supabase
            .from('fc_farm_team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            id: team.id,
            team_name: team.team_name,
            team_role: team.team_role,
            team_leader_id: team.team_leader_id,
            team_leader_name: team.team_leader?.name_ar || null,
            members_count: count || 0,
            is_active: team.is_active
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (err: any) {
      console.error('Error loading teams:', err);
    }
  };

  const assignFarmManager = async (staffId: string) => {
    if (!farmId) return { success: false, error: 'No farm ID' };

    try {
      const { data: opFarm } = await supabase
        .from('fc_operational_farms')
        .select('id')
        .eq('farm_id', farmId)
        .maybeSingle();

      if (!opFarm) {
        return { success: false, error: 'Operational farm not found' };
      }

      const { error } = await supabase
        .from('fc_operational_farms')
        .update({ farm_manager_id: staffId, updated_at: new Date().toISOString() })
        .eq('id', opFarm.id);

      if (error) throw error;

      await loadFarmData();
      return { success: true };
    } catch (err: any) {
      console.error('Error assigning farm manager:', err);
      return { success: false, error: err.message };
    }
  };

  const createTeam = async (teamData: {
    team_name: string;
    team_role: string;
    team_leader_id?: string;
  }) => {
    if (!farmId) return { success: false, error: 'No farm ID' };

    try {
      const { data: opFarm } = await supabase
        .from('fc_operational_farms')
        .select('id')
        .eq('farm_id', farmId)
        .maybeSingle();

      if (!opFarm) {
        return { success: false, error: 'Operational farm not found' };
      }

      const { error } = await supabase
        .from('fc_farm_teams')
        .insert({
          operational_farm_id: opFarm.id,
          ...teamData,
          is_active: true
        });

      if (error) throw error;

      await loadTeams();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating team:', err);
      return { success: false, error: err.message };
    }
  };

  const isSetupComplete = () => {
    if (!operationalFarm) return false;
    return (
      operationalFarm.farm_manager_id !== null &&
      operationalFarm.teams_count >= 1
    );
  };

  const canAccessOperations = () => {
    return isSetupComplete();
  };

  return {
    operationalFarm,
    teams,
    loading,
    error,
    assignFarmManager,
    createTeam,
    isSetupComplete,
    canAccessOperations,
    refetch: loadFarmData
  };
}
