import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Section } from '../components/SectionTabs';
import type { SubType } from '../components/CompanyTabs';

interface Category {
  id: string;
  section: string;
  sub_type: string | null;
  name_ar: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export function useCategories(section: Section, subType?: SubType | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [section, subType]);

  async function fetchCategories() {
    try {
      setLoading(true);

      let query = supabase
        .from('categories')
        .select('*')
        .eq('section', section)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (section === 'companies') {
        if (subType) {
          query = query.eq('sub_type', subType);
        }
      } else {
        query = query.is('sub_type', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  return { categories, loading, refetch: fetchCategories };
}
