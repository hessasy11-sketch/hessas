import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VisitsSummary {
  total_today: number;
  b2f_today: number;
  b2b_today: number;
  total_week: number;
  as_of: string;
}

interface TopFarm {
  farm_id: string;
  farm_name: string;
  visit_count: number;
  last_visit: string;
}

interface TopAuction {
  auction_id: string;
  auction_title: string;
  auction_status: string;
  visit_count: number;
  last_visit: string;
}

export function useVisitsTracking() {
  const [summary, setSummary] = useState<VisitsSummary | null>(null);
  const [topFarms, setTopFarms] = useState<TopFarm[]>([]);
  const [topAuctions, setTopAuctions] = useState<TopAuction[]>([]);
  const [loading, setLoading] = useState(false);

  // تسجيل زيارة صفحة
  const trackPageView = useCallback(async (
    path: string,
    options?: {
      farmId?: string;
      auctionId?: string;
      metadata?: any;
    }
  ) => {
    try {
      const userAgent = navigator.userAgent;
      const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
      sessionStorage.setItem('session_id', sessionId);

      await supabase.rpc('track_page_view', {
        p_path: path,
        p_user_agent: userAgent,
        p_farm_id: options?.farmId || null,
        p_auction_id: options?.auctionId || null,
        p_session_id: sessionId,
        p_metadata: options?.metadata || {}
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }, []);

  // تحميل ملخص الزيارات
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_visits_summary');

      if (error) {
        console.error('Error loading visits summary:', error);
        return;
      }

      setSummary(data);
    } catch (error) {
      console.error('Error loading visits summary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // تحميل أكثر المزارع زيارة
  const loadTopFarms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_top_farms_24h');

      if (error) {
        console.error('Error loading top farms:', error);
        return;
      }

      setTopFarms(data || []);
    } catch (error) {
      console.error('Error loading top farms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // تحميل أكثر المزادات زيارة
  const loadTopAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_top_auctions_24h');

      if (error) {
        console.error('Error loading top auctions:', error);
        return;
      }

      setTopAuctions(data || []);
    } catch (error) {
      console.error('Error loading top auctions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summary,
    topFarms,
    topAuctions,
    loading,
    trackPageView,
    loadSummary,
    loadTopFarms,
    loadTopAuctions
  };
}

// Hook خاص لتتبع الصفحة تلقائياً
export function usePageTracking(
  path: string,
  options?: {
    farmId?: string;
    auctionId?: string;
    metadata?: any;
  }
) {
  const { trackPageView } = useVisitsTracking();

  useEffect(() => {
    trackPageView(path, options);
  }, [path, options?.farmId, options?.auctionId]);
}
