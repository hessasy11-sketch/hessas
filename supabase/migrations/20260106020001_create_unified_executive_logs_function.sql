/*
  # دالة موحدة للسجل القيادي

  ## الهدف
  جمع آخر 50 إجراء قيادي من B2F و B2B في قائمة واحدة

  ## الوظيفة الجديدة
  get_executive_logs_for_gm(limit_count integer DEFAULT 50)

  ## البيانات المعادة
  - id
  - source (b2f/b2b)
  - action_type
  - title (عربي واضح)
  - performed_by
  - performer_name
  - result (success/failure/partial)
  - created_at
  - context (تفاصيل خاصة بكل إجراء)
*/

-- ============================================
-- دالة موحدة لجلب السجل القيادي
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_logs_for_gm(
  limit_count integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_json jsonb;
BEGIN
  -- دمج السجلات من B2F و B2B
  WITH b2f_logs AS (
    SELECT
      el.id,
      'b2f' as source,
      el.action_type,
      COALESCE(
        CASE el.action_type
          WHEN 'decision_approved' THEN 'قرار معتمد: ' || COALESCE(f.name, 'مزرعة')
          WHEN 'decision_rejected' THEN 'قرار مرفوض: ' || COALESCE(f.name, 'مزرعة')
          WHEN 'farm_manager_assigned' THEN 'تعيين مدير مزرعة: ' || COALESCE(f.name, 'مزرعة')
          WHEN 'expense_approved' THEN 'مصروف معتمد: ' || COALESCE(f.name, 'مزرعة')
          WHEN 'farm_locked' THEN 'مزرعة موقفة: ' || COALESCE(f.name, 'مزرعة')
          WHEN 'farm_unlocked' THEN 'مزرعة مفعلة: ' || COALESCE(f.name, 'مزرعة')
          ELSE el.action_type
        END,
        'إجراء B2F'
      ) as title,
      el.performed_by,
      COALESCE(ps.full_name, ps.staff_code, 'غير معروف') as performer_name,
      el.result,
      el.created_at,
      jsonb_build_object(
        'farm_id', el.farm_id,
        'farm_name', f.name,
        'staff_id', el.staff_id,
        'decision_id', el.decision_id,
        'notes', el.notes,
        'action_data', el.action_data
      ) as context
    FROM executive_logs el
    LEFT JOIN b2f_farms f ON f.id = el.farm_id
    LEFT JOIN platform_staff ps ON ps.id = el.performed_by
    ORDER BY el.created_at DESC
    LIMIT limit_count
  ),
  b2b_logs AS (
    SELECT
      el.id,
      'b2b' as source,
      el.action_type,
      COALESCE(
        CASE el.action_type
          WHEN 'auction_paused' THEN 'مزاد موقف: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_activated' THEN 'مزاد مفعل: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_extended' THEN 'مزاد ممدد: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_cancelled' THEN 'مزاد ملغى: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_result_approved' THEN 'نتيجة مزاد معتمدة: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_removed' THEN 'مزاد محذوف: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_reviewed' THEN 'مزاد مراجع: ' || COALESCE(a.title, 'مزاد')
          WHEN 'auction_time_extended' THEN 'وقت مزاد ممدد: ' || COALESCE(a.title, 'مزاد')
          ELSE el.action_type
        END,
        'إجراء B2B'
      ) as title,
      el.performed_by,
      COALESCE(ps.full_name, ps.staff_code, 'غير معروف') as performer_name,
      el.result,
      el.created_at,
      jsonb_build_object(
        'auction_id', el.auction_id,
        'auction_title', a.title,
        'decision_id', el.decision_id,
        'notes', el.notes,
        'action_data', el.action_data
      ) as context
    FROM b2b_executive_logs el
    LEFT JOIN auctions a ON a.id = el.auction_id
    LEFT JOIN platform_staff ps ON ps.id = el.performed_by
    ORDER BY el.created_at DESC
    LIMIT limit_count
  ),
  all_logs AS (
    SELECT * FROM b2f_logs
    UNION ALL
    SELECT * FROM b2b_logs
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'source', source,
      'action_type', action_type,
      'title', title,
      'performed_by', performed_by,
      'performer_name', performer_name,
      'result', result,
      'created_at', created_at,
      'context', context
    )
    ORDER BY created_at DESC
  )
  INTO result_json
  FROM (
    SELECT *
    FROM all_logs
    ORDER BY created_at DESC
    LIMIT limit_count
  ) limited_logs;

  RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;

-- ============================================
-- منح الصلاحيات
-- ============================================

GRANT EXECUTE ON FUNCTION get_executive_logs_for_gm TO authenticated, anon, service_role;

COMMENT ON FUNCTION get_executive_logs_for_gm IS 'Returns last N executive actions from both B2F and B2B systems for General Manager';
