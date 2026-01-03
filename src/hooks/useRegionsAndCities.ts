import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Region {
  id: string;
  name_ar: string;
  name_en: string;
  display_order: number;
}

export interface City {
  id: string;
  region_id: string;
  name_ar: string;
  name_en: string;
  display_order: number;
}

export function useRegionsAndCities() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRegions();
    loadCities();
  }, []);

  const loadRegions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('regions')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setRegions(data || []);
    } catch (err) {
      console.error('Error loading regions:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل المناطق');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setCities(data || []);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل المدن');
    }
  };

  const getCitiesByRegion = (regionId: string): City[] => {
    return cities.filter(city => city.region_id === regionId);
  };

  const getRegionById = (regionId: string): Region | undefined => {
    return regions.find(region => region.id === regionId);
  };

  const getCityById = (cityId: string): City | undefined => {
    return cities.find(city => city.id === cityId);
  };

  return {
    regions,
    cities,
    loading,
    error,
    getCitiesByRegion,
    getRegionById,
    getCityById,
  };
}
