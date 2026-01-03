/*
  # Insert Plan Permissions Data

  1. Inserts permissions for all three roles
  2. FREE: 4 tools, no advanced features
  3. SILVER: 7 tools, limited extend/republish
  4. GOLD: 12 tools, unlimited features, AI access
*/

DO $$
DECLARE
  free_role_id uuid;
  silver_role_id uuid;
  gold_role_id uuid;
BEGIN
  SELECT id INTO free_role_id FROM plan_roles WHERE role_key = 'free_seller';
  SELECT id INTO silver_role_id FROM plan_roles WHERE role_key = 'silver_seller';
  SELECT id INTO gold_role_id FROM plan_roles WHERE role_key = 'gold_seller';

  INSERT INTO plan_permissions (role_id, permission_key, permission_name_ar, permission_type, is_allowed, limit_value, limit_unit) VALUES
    (free_role_id, 'close_auction', 'إغلاق المزاد', 'tool', true, NULL, NULL),
    (free_role_id, 'mark_sold', 'تحديد كمباع', 'tool', true, NULL, NULL),
    (free_role_id, 'share_auction', 'مشاركة المزاد', 'tool', true, NULL, NULL),
    (free_role_id, 'view_stats', 'عرض الإحصائيات', 'tool', true, NULL, NULL),
    (free_role_id, 'extend_auction', 'تمديد المزاد', 'tool', false, NULL, NULL),
    (free_role_id, 'republish', 'إعادة نشر المزاد', 'tool', false, NULL, NULL),
    (free_role_id, 'closing_alert', 'إعلان قرب الانتهاء', 'tool', false, NULL, NULL),
    (free_role_id, 'smart_assistant', 'المساعد الذكي', 'feature', false, NULL, NULL),
    (free_role_id, 'ai_insights', 'الرؤى الذكية', 'feature', false, NULL, NULL),
    (free_role_id, 'smart_suggestions', 'الاقتراحات الذكية', 'feature', false, NULL, NULL),
    (free_role_id, 'max_extend_hours', 'ساعات التمديد', 'limit', false, 0, 'hours'),
    (free_role_id, 'republish_count', 'عدد إعادة النشر', 'limit', false, 0, 'times'),
    
    (silver_role_id, 'close_auction', 'إغلاق المزاد', 'tool', true, NULL, NULL),
    (silver_role_id, 'mark_sold', 'تحديد كمباع', 'tool', true, NULL, NULL),
    (silver_role_id, 'share_auction', 'مشاركة المزاد', 'tool', true, NULL, NULL),
    (silver_role_id, 'view_stats', 'عرض الإحصائيات', 'tool', true, NULL, NULL),
    (silver_role_id, 'extend_auction', 'تمديد المزاد', 'tool', true, NULL, NULL),
    (silver_role_id, 'republish', 'إعادة نشر المزاد', 'tool', true, NULL, NULL),
    (silver_role_id, 'closing_alert', 'إعلان قرب الانتهاء', 'tool', true, NULL, NULL),
    (silver_role_id, 'smart_assistant', 'المساعد الذكي', 'feature', false, NULL, NULL),
    (silver_role_id, 'ai_insights', 'الرؤى الذكية', 'feature', false, NULL, NULL),
    (silver_role_id, 'smart_suggestions', 'الاقتراحات الذكية', 'feature', true, NULL, NULL),
    (silver_role_id, 'max_extend_hours', 'ساعات التمديد', 'limit', true, 48, 'hours'),
    (silver_role_id, 'republish_count', 'عدد إعادة النشر', 'limit', true, 2, 'times'),
    
    (gold_role_id, 'close_auction', 'إغلاق المزاد', 'tool', true, NULL, NULL),
    (gold_role_id, 'mark_sold', 'تحديد كمباع', 'tool', true, NULL, NULL),
    (gold_role_id, 'share_auction', 'مشاركة المزاد', 'tool', true, NULL, NULL),
    (gold_role_id, 'view_stats', 'عرض الإحصائيات', 'tool', true, NULL, NULL),
    (gold_role_id, 'extend_auction', 'تمديد المزاد', 'tool', true, NULL, NULL),
    (gold_role_id, 'republish', 'إعادة نشر المزاد', 'tool', true, NULL, NULL),
    (gold_role_id, 'closing_alert', 'إعلان قرب الانتهاء', 'tool', true, NULL, NULL),
    (gold_role_id, 'smart_assistant', 'المساعد الذكي', 'feature', true, NULL, NULL),
    (gold_role_id, 'ai_insights', 'الرؤى الذكية', 'feature', true, NULL, NULL),
    (gold_role_id, 'smart_suggestions', 'الاقتراحات الذكية', 'feature', true, NULL, NULL),
    (gold_role_id, 'priority_support', 'الدعم ذو الأولوية', 'feature', true, NULL, NULL),
    (gold_role_id, 'advanced_analytics', 'تحليلات متقدمة', 'feature', true, NULL, NULL),
    (gold_role_id, 'max_extend_hours', 'ساعات التمديد', 'limit', true, 168, 'hours'),
    (gold_role_id, 'republish_count', 'عدد إعادة النشر', 'limit', true, 999, 'times')
  ON CONFLICT (role_id, permission_key) DO NOTHING;
END $$;
