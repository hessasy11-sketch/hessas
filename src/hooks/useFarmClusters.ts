import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ClusterMetrics {
  farms_count: number;
  active_farms: number;
  struggling_farms: number;
  total_expenses_30d: number;
  pending_decisions: number;
  pending_expenses: number;
  avg_performance: number;
  health_status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ClusterInfo {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  region_id?: string;
  region_name?: string;
  status: 'active' | 'inactive' | 'restructuring';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  metrics?: ClusterMetrics;
}

export interface ClusterSummary {
  id: string;
  name: string;
  name_en?: string;
  supervisor_name?: string;
  region_name?: string;
  status: string;
  priority: string;
  farms_count: number;
  active_farms: number;
  struggling_farms: number;
  total_expenses_30d: number;
  pending_decisions: number;
  avg_performance: number;
}

export function useFarmClusters() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClusters = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_all_clusters_summary');

      if (err) throw err;

      setClusters(data || []);
    } catch (err: any) {
      console.error('Error loading clusters:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClusterMetrics = async (clusterId: string): Promise<ClusterInfo | null> => {
    try {
      const { data, error: err } = await supabase.rpc('get_cluster_metrics', {
        p_cluster_id: clusterId
      });

      if (err) throw err;

      return data;
    } catch (err: any) {
      console.error('Error loading cluster metrics:', err);
      return null;
    }
  };

  const createCluster = async (clusterData: {
    name: string;
    name_en?: string;
    description?: string;
    supervisor_id?: string;
    region_id?: string;
    city_id?: string;
    priority?: string;
  }): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase.rpc('create_farm_cluster', {
        p_name: clusterData.name,
        p_name_en: clusterData.name_en,
        p_description: clusterData.description,
        p_supervisor_id: clusterData.supervisor_id,
        p_region_id: clusterData.region_id,
        p_city_id: clusterData.city_id,
        p_priority: clusterData.priority || 'normal'
      });

      if (err) throw err;

      await loadClusters();
      return data;
    } catch (err: any) {
      console.error('Error creating cluster:', err);
      return null;
    }
  };

  const updateCluster = async (clusterId: string, updates: Partial<{
    name: string;
    name_en: string;
    description: string;
    supervisor_id: string;
    region_id: string;
    city_id: string;
    status: string;
    priority: string;
  }>): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('update_farm_cluster', {
        p_cluster_id: clusterId,
        p_name: updates.name,
        p_name_en: updates.name_en,
        p_description: updates.description,
        p_supervisor_id: updates.supervisor_id,
        p_region_id: updates.region_id,
        p_city_id: updates.city_id,
        p_status: updates.status,
        p_priority: updates.priority
      });

      if (err) throw err;

      await loadClusters();
      return data;
    } catch (err: any) {
      console.error('Error updating cluster:', err);
      return false;
    }
  };

  const deleteCluster = async (clusterId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('delete_farm_cluster', {
        p_cluster_id: clusterId
      });

      if (err) throw err;

      await loadClusters();
      return data;
    } catch (err: any) {
      console.error('Error deleting cluster:', err);
      return false;
    }
  };

  const assignFarmToCluster = async (farmId: string, clusterId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('assign_farm_to_cluster', {
        p_farm_id: farmId,
        p_cluster_id: clusterId
      });

      if (err) throw err;

      await loadClusters();
      return data;
    } catch (err: any) {
      console.error('Error assigning farm to cluster:', err);
      return false;
    }
  };

  const unassignFarmFromCluster = async (farmId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.rpc('unassign_farm_from_cluster', {
        p_farm_id: farmId
      });

      if (err) throw err;

      await loadClusters();
      return data;
    } catch (err: any) {
      console.error('Error unassigning farm from cluster:', err);
      return false;
    }
  };

  useEffect(() => {
    loadClusters();

    const subscription = supabase
      .channel('farm-clusters-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'farm_clusters'
      }, () => {
        loadClusters();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    clusters,
    loading,
    error,
    refresh: loadClusters,
    getClusterMetrics,
    createCluster,
    updateCluster,
    deleteCluster,
    assignFarmToCluster,
    unassignFarmFromCluster
  };
}
