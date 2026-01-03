import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuctionTool {
  id: string;
  tool_key: string;
  tool_name_ar: string;
  tool_name_en: string;
  description_ar: string;
  icon: string;
  category: 'basic' | 'premium' | 'ai';
  available_in_free: boolean;
  available_in_silver: boolean;
  available_in_gold: boolean;
  requires_ai: boolean;
  display_order: number;
}

export function useAuctionTools(currentPlanType: 'free' | 'silver' | 'gold') {
  const [tools, setTools] = useState<AuctionTool[]>([]);
  const [availableTools, setAvailableTools] = useState<AuctionTool[]>([]);
  const [lockedTools, setLockedTools] = useState<AuctionTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTools() {
      try {
        const { data, error } = await supabase
          .from('auction_tools')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data) {
          setTools(data);

          const available: AuctionTool[] = [];
          const locked: AuctionTool[] = [];

          data.forEach((tool) => {
            let isAvailable = false;

            switch (currentPlanType) {
              case 'free':
                isAvailable = tool.available_in_free;
                break;
              case 'silver':
                isAvailable = tool.available_in_silver;
                break;
              case 'gold':
                isAvailable = tool.available_in_gold;
                break;
            }

            if (isAvailable) {
              available.push(tool);
            } else {
              locked.push(tool);
            }
          });

          setAvailableTools(available);
          setLockedTools(locked);
        }
      } catch (error) {
        console.error('Error fetching auction tools:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTools();
  }, [currentPlanType]);

  return {
    tools,
    availableTools,
    lockedTools,
    loading
  };
}
