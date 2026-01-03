/*
  # إنشاء Views للإدارة المالية

  1. التغييرات
    - View للإيصالات المقبولة آلياً (في انتظار اعتماد المالية)
    - View للإيصالات المرفوضة آلياً (في انتظار قرار المالية)
    - Function لإحصائيات المالية السريعة

  2. الفائدة
    - تسريع استعلامات المالية
    - واجهة واضحة للبيانات
*/

-- View: الإيصالات المقبولة آلياً
CREATE OR REPLACE VIEW finance_auto_approved_queue AS
SELECT 
  sr.id,
  sr.investor_name,
  sr.investor_phone,
  sr.investor_email,
  sr.number_of_trees,
  sr.tree_type,
  sr.total_amount,
  sr.payment_receipt_url,
  sr.ai_verification_status,
  sr.ai_verification_notes,
  sr.ai_confidence_score,
  sr.expected_amount,
  sr.ai_analysis_result,
  sr.ai_verified_at,
  sr.created_at,
  sr.updated_at,
  f.name as farm_name,
  o.title as opportunity_title,
  -- حساب المدة منذ التحليل
  EXTRACT(EPOCH FROM (NOW() - sr.ai_verified_at))/3600 as hours_since_verification
FROM b2f_sales_requests sr
LEFT JOIN b2f_farms f ON sr.farm_id = f.id
LEFT JOIN b2f_opportunities o ON sr.opportunity_id = o.id
WHERE sr.status = 'auto_approved'
ORDER BY sr.ai_verified_at DESC;

-- View: الإيصالات المرفوضة آلياً
CREATE OR REPLACE VIEW finance_auto_rejected_queue AS
SELECT 
  sr.id,
  sr.investor_name,
  sr.investor_phone,
  sr.investor_email,
  sr.number_of_trees,
  sr.tree_type,
  sr.total_amount,
  sr.payment_receipt_url,
  sr.ai_verification_status,
  sr.ai_verification_notes,
  sr.ai_confidence_score,
  sr.rejection_reason,
  sr.expected_amount,
  sr.ai_analysis_result,
  sr.ai_verified_at,
  sr.created_at,
  sr.updated_at,
  f.name as farm_name,
  o.title as opportunity_title,
  EXTRACT(EPOCH FROM (NOW() - sr.ai_verified_at))/3600 as hours_since_verification
FROM b2f_sales_requests sr
LEFT JOIN b2f_farms f ON sr.farm_id = f.id
LEFT JOIN b2f_opportunities o ON sr.opportunity_id = o.id
WHERE sr.status = 'auto_rejected'
ORDER BY sr.ai_verified_at DESC;

-- Function: إحصائيات سريعة للمالية
CREATE OR REPLACE FUNCTION get_finance_queue_stats()
RETURNS TABLE (
  auto_approved_count BIGINT,
  auto_rejected_count BIGINT,
  auto_approved_total_amount NUMERIC,
  auto_rejected_total_amount NUMERIC,
  oldest_pending_hours NUMERIC,
  unread_notifications_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- عدد المقبولة آلياً
    (SELECT COUNT(*) FROM b2f_sales_requests WHERE status = 'auto_approved') as auto_approved_count,
    -- عدد المرفوضة آلياً
    (SELECT COUNT(*) FROM b2f_sales_requests WHERE status = 'auto_rejected') as auto_rejected_count,
    -- مجموع المبالغ المقبولة
    (SELECT COALESCE(SUM(total_amount), 0) FROM b2f_sales_requests WHERE status = 'auto_approved') as auto_approved_total_amount,
    -- مجموع المبالغ المرفوضة
    (SELECT COALESCE(SUM(total_amount), 0) FROM b2f_sales_requests WHERE status = 'auto_rejected') as auto_rejected_total_amount,
    -- أقدم طلب في انتظار المراجعة (بالساعات)
    (SELECT EXTRACT(EPOCH FROM (NOW() - MIN(ai_verified_at)))/3600 
     FROM b2f_sales_requests 
     WHERE status IN ('auto_approved', 'auto_rejected')) as oldest_pending_hours,
    -- عدد الإشعارات غير المقروءة
    (SELECT COUNT(*) 
     FROM b2f_notifications 
     WHERE target_audience = 'finance_team' 
     AND is_read = false
     AND notification_type IN ('ai_auto_approved', 'ai_auto_rejected')) as unread_notifications_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات للـ Views
GRANT SELECT ON finance_auto_approved_queue TO authenticated;
GRANT SELECT ON finance_auto_rejected_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_finance_queue_stats() TO authenticated;

-- تعليقات
COMMENT ON VIEW finance_auto_approved_queue IS 'قائمة الإيصالات المقبولة آلياً في انتظار اعتماد المالية';
COMMENT ON VIEW finance_auto_rejected_queue IS 'قائمة الإيصالات المرفوضة آلياً في انتظار قرار المالية';
COMMENT ON FUNCTION get_finance_queue_stats() IS 'إحصائيات سريعة لطابور الإدارة المالية';
