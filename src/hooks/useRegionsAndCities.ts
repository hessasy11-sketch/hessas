import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { retryFetch } from '../utils/retryFetch';

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
      const result = await retryFetch(async () => {
        const { data, error: fetchError } = await supabase
          .from('regions')
          .select('*')
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;
        return data;
      }, 2, 500);

      setRegions(result || []);
    } catch (err) {
      console.error('Error loading regions:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل المناطق');
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const result = await retryFetch(async () => {
        const { data, error: fetchError } = await supabase
          .from('cities')
          .select('*')
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;
        return data;
      }, 2, 500);

      setCities(result || []);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل المدن');
      setCities([]);
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
