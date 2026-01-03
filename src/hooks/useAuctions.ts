import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Section } from '../components/SectionTabs';
import type { SubType } from '../components/CompanyTabs';

interface Auction {
  id: string;
  owner_id: string;
  section: string;
  category_id: string | null;
  group_id: string | null;
  sub_type: string | null;
  title: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  images: string[];
  status: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  seller_plan_type?: string;
  display_priority?: number;
  priority_score?: number;
  region_id?: string | null;
  city_id?: string | null;
}

export function useAuctions(
  section?: Section,
  categoryId?: string,
  subType?: SubType,
  groupId?: string,
  regionId?: string | null,
  cityIds?: string[]
) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuctions();

    const channel = supabase
      .channel('auctions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        () => {
          loadAuctions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [section, categoryId, subType, groupId, regionId, cityIds]);

  const loadAuctions = async () => {
    try {
      let query = supabase
        .from('auctions')
        .select('*');

      if (section) {
        query = query.eq('section', section);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (subType && section === 'companies') {
        query = query.eq('sub_type', subType);
      }

      if (groupId && section === 'groups') {
        query = query.eq('group_id', groupId);
      }

      if (cityIds && cityIds.length > 0) {
        query = query.in('city_id', cityIds);
      } else if (regionId) {
        query = query.eq('region_id', regionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // ترتيب ذكي للمزادات - نظام حراج من الجذور
      const sortedAuctions = (data || []).sort((a, b) => {
        // تصنيف الحالات الصحيحة من قاعدة البيانات
        const activeStatuses = ['active', 'upcoming', 'extended'];
        const inactiveStatuses = ['sold', 'completed'];

        const isActiveA = activeStatuses.includes(a.status);
        const isActiveB = activeStatuses.includes(b.status);

        // القاعدة الأولى: المزادات النشطة دائماً في الأعلى
        if (isActiveA && !isActiveB) return -1;
        if (!isActiveA && isActiveB) return 1;

        // القاعدة الثانية: للمزادات النشطة - ترتيب حسب الباقة
        if (isActiveA && isActiveB) {
          const planOrder: Record<string, number> = {
            gold: 1,
            silver: 2,
            free: 3
          };

          const planA = planOrder[a.seller_plan_type || 'free'] || 3;
          const planB = planOrder[b.seller_plan_type || 'free'] || 3;

          // إذا كانت الباقات مختلفة - الذهبية أولاً
          if (planA !== planB) {
            return planA - planB;
          }

          // إذا كانت نفس الباقة - الأحدث أولاً (نظام حراج)
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        }

        // القاعدة الثالثة: للمزادات غير النشطة - الأحدث أولاً
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });

      setAuctions(sortedAuctions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createAuction = async (auction: Partial<Auction>) => {
    const { data, error: createError } = await supabase
      .from('auctions')
      .insert(auction)
      .select()
      .single();

    if (createError) throw createError;
    return data;
  };

  const updateAuction = async (id: string, updates: Partial<Auction>) => {
    const { data, error: updateError } = await supabase
      .from('auctions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  };

  const deleteAuction = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('auctions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  };

  return {
    auctions,
    loading,
    error,
    createAuction,
    updateAuction,
    deleteAuction,
    refresh: loadAuctions,
  };
}
