import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_name_ar: string;
  description_ar: string | null;
  metadata: any;
  is_ai_action: boolean;
  ai_confidence: number | null;
  can_rollback: boolean;
  created_at: string;
}

interface ActivityStats {
  total_actions: number;
  ai_actions: number;
  manual_actions: number;
  last_activity: string;
  most_common_action: string;
}

export function useActivityLog(auctionId: string | undefined) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auctionId) {
      loadActivities();
      loadStats();

      const channel = supabase
        .channel(`activity-log-${auctionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_activity_log',
            filter: `auction_id=eq.${auctionId}`,
          },
          () => {
            loadActivities();
            loadStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [auctionId]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auction_activity_log', {
        p_auction_id: auctionId,
        p_limit: 50,
      });

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auction_activity_stats', {
        p_auction_id: auctionId,
      });

      if (error) throw error;

      setStats(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    }
  };

  const logActivity = async (
    activityType: string,
    activityNameAr: string,
    options?: {
      descriptionAr?: string;
      metadata?: any;
      beforeState?: any;
      afterState?: any;
      isAiAction?: boolean;
      aiConfidence?: number;
      canRollback?: boolean;
      rollbackData?: any;
    }
  ): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId || !auctionId) {
        throw new Error('User or auction ID missing');
      }

      const { data, error } = await supabase.rpc('log_auction_activity', {
        p_auction_id: auctionId,
        p_user_id: userId,
        p_activity_type: activityType,
        p_activity_name_ar: activityNameAr,
        p_description_ar: options?.descriptionAr || null,
        p_metadata: options?.metadata || {},
        p_before_state: options?.beforeState || null,
        p_after_state: options?.afterState || null,
        p_is_ai_action: options?.isAiAction || false,
        p_ai_confidence: options?.aiConfidence || null,
        p_can_rollback: options?.canRollback || false,
        p_rollback_data: options?.rollbackData || null,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error logging activity:', error);
      return null;
    }
  };

  const logCloseAuction = async (chatStatus: string) => {
    return await logActivity(
      'close_auction',
      chatStatus === 'closed' ? 'إغلاق المزاد' : 'فتح المزاد',
      {
        descriptionAr: chatStatus === 'closed' ? 'تم إغلاق المزايدة' : 'تم فتح المزايدة',
        metadata: { chat_status: chatStatus },
        beforeState: { chat_status: chatStatus === 'closed' ? 'open' : 'closed' },
        afterState: { chat_status: chatStatus },
        canRollback: true,
        rollbackData: { chat_status: chatStatus === 'closed' ? 'open' : 'closed' },
      }
    );
  };

  const logExtendAuction = async (hours: number, newEndDate: string, oldEndDate: string) => {
    return await logActivity('extend_auction', 'تمديد المزاد', {
      descriptionAr: `تم تمديد المزاد ${hours} ساعة`,
      metadata: { hours, new_end_date: newEndDate, old_end_date: oldEndDate },
      beforeState: { ends_at: oldEndDate },
      afterState: { ends_at: newEndDate },
      canRollback: true,
      rollbackData: { ends_at: oldEndDate },
    });
  };

  const logMarkSold = async () => {
    return await logActivity('mark_sold', 'تحديد كمباع', {
      descriptionAr: 'تم تحديد المزاد كمباع',
      metadata: { final_status: 'sold' },
      beforeState: { status: 'active' },
      afterState: { status: 'sold' },
      canRollback: false,
    });
  };

  const logShareAuction = async (platform: string = 'whatsapp') => {
    return await logActivity('share_auction', 'مشاركة المزاد', {
      descriptionAr: `تمت مشاركة المزاد عبر ${platform}`,
      metadata: { platform, shared_at: new Date().toISOString() },
      canRollback: false,
    });
  };

  const logRepublishAuction = async () => {
    return await logActivity('republish_auction', 'إعادة نشر المزاد', {
      descriptionAr: 'تمت إعادة نشر المزاد',
      metadata: { republished_at: new Date().toISOString() },
      canRollback: false,
    });
  };

  const logClosingAlert = async (hoursBeforeEnd: number) => {
    return await logActivity('closing_alert', 'إعلان قرب الانتهاء', {
      descriptionAr: `تم إرسال إعلان قبل ${hoursBeforeEnd} ساعة من الانتهاء`,
      metadata: { hours_before_end: hoursBeforeEnd },
      canRollback: false,
    });
  };

  const logAiAnalysis = async (analysisType: string, confidence: number, result: any) => {
    return await logActivity('ai_analysis', 'تحليل ذكي', {
      descriptionAr: `تم تحليل المزاد بواسطة الذكاء الصناعي: ${analysisType}`,
      metadata: { analysis_type: analysisType, result },
      isAiAction: true,
      aiConfidence: confidence,
      canRollback: false,
    });
  };

  const logAiSuggestion = async (suggestionType: string, suggestionText: string, confidence: number) => {
    return await logActivity('ai_suggestion', 'اقتراح ذكي', {
      descriptionAr: suggestionText,
      metadata: { suggestion_type: suggestionType },
      isAiAction: true,
      aiConfidence: confidence,
      canRollback: false,
    });
  };

  const logAiAlert = async (alertType: string, alertText: string, severity: string) => {
    return await logActivity('ai_alert', 'تنبيه ذكي', {
      descriptionAr: alertText,
      metadata: { alert_type: alertType, severity },
      isAiAction: true,
      canRollback: false,
    });
  };

  const logStatusChange = async (oldStatus: string, newStatus: string, reason?: string) => {
    return await logActivity('status_change', 'تغيير حالة المزاد', {
      descriptionAr: reason || `تم تغيير الحالة من ${oldStatus} إلى ${newStatus}`,
      metadata: { old_status: oldStatus, new_status: newStatus, reason },
      beforeState: { status: oldStatus },
      afterState: { status: newStatus },
      canRollback: true,
      rollbackData: { status: oldStatus },
    });
  };

  const logPriceUpdate = async (oldPrice: number, newPrice: number) => {
    return await logActivity('price_update', 'تحديث السعر', {
      descriptionAr: `تم تحديث السعر من ${oldPrice} إلى ${newPrice} ر.س`,
      metadata: { old_price: oldPrice, new_price: newPrice },
      beforeState: { current_price: oldPrice },
      afterState: { current_price: newPrice },
      canRollback: false,
    });
  };

  return {
    activities,
    stats,
    loading,
    logActivity,
    logCloseAuction,
    logExtendAuction,
    logMarkSold,
    logShareAuction,
    logRepublishAuction,
    logClosingAlert,
    logAiAnalysis,
    logAiSuggestion,
    logAiAlert,
    logStatusChange,
    logPriceUpdate,
  };
}
