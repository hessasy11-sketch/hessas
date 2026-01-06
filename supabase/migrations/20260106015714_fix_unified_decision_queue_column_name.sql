/*
  # إصلاح اسم العمود في دالة القرارات الموحدة

  ## الإصلاح
  تغيير full_name_ar إلى full_name في جدول platform_staff
*/

-- ============================================
-- تحديث الدالة مع اسم العمود الصحيح
-- ============================================

CREATE OR REPLACE FUNCTION get_all_pending_decisions_for_gm()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_json jsonb;
BEGIN
  -- دمج القرارات من B2F و B2B
  WITH b2f_decisions AS (
    SELECT
      dq.id,
      'b2f' as source,
      dq.decision_type,
      COALESCE(
        CASE dq.decision_type
          WHEN 'assign_farm_manager' THEN 'تعيين مدير مزرعة: ' || COALESCE(f.name, 'غير محدد')
          WHEN 'approve_expense' THEN 'اعتماد مصروف: ' || COALESCE(dq.expense_description, 'غير محدد')
          WHEN 'suspend_farm' THEN 'إيقاف مزرعة: ' || COALESCE(f.name, 'غير محدد')
          ELSE dq.decision_type
        END,
        'قرار B2F'
      ) as title,
      dq.priority,
      dq.requested_by,
      COALESCE(ps.full_name, ps.staff_code, 'غير معروف') as requester_name,
      dq.created_at,
      jsonb_build_object(
        'farm_id', dq.farm_id,
        'farm_name', f.name,
        'expense_amount', dq.expense_amount,
        'expense_description', dq.expense_description,
        'target_staff_id', dq.target_staff_id,
        'notes', dq.notes
      ) as context
    FROM decision_queue dq
    LEFT JOIN b2f_farms f ON f.id = dq.farm_id
    LEFT JOIN platform_staff ps ON ps.id = dq.requested_by
    WHERE dq.status = 'pending'
  ),
  b2b_decisions AS (
    SELECT
      dq.id,
      'b2b' as source,
      dq.decision_type,
      COALESCE(
        CASE dq.decision_type
          WHEN 'pause_auction' THEN 'إيقاف مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          WHEN 'activate_auction' THEN 'تفعيل مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          WHEN 'extend_auction' THEN 'تمديد مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          WHEN 'cancel_auction' THEN 'إلغاء مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          WHEN 'remove_auction' THEN 'حذف مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          WHEN 'review_auction' THEN 'مراجعة مزاد: ' || COALESCE(dq.auction_title, a.title, 'غير محدد')
          ELSE dq.decision_type
        END,
        'قرار B2B'
      ) as title,
      dq.priority,
      dq.requested_by,
      COALESCE(ps.full_name, ps.staff_code, 'غير معروف') as requester_name,
      dq.created_at,
      jsonb_build_object(
        'auction_id', dq.auction_id,
        'auction_title', COALESCE(dq.auction_title, a.title),
        'notes', dq.notes,
        'action_data', dq.action_data
      ) as context
    FROM b2b_decision_queue dq
    LEFT JOIN auctions a ON a.id = dq.auction_id
    LEFT JOIN platform_staff ps ON ps.id = dq.requested_by
    WHERE dq.status = 'pending'
  ),
  all_decisions AS (
    SELECT * FROM b2f_decisions
    UNION ALL
    SELECT * FROM b2b_decisions
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'source', source,
      'decision_type', decision_type,
      'title', title,
      'priority', priority,
      'requested_by', requested_by,
      'requester_name', requester_name,
      'created_at', created_at,
      'context', context
    )
    ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      created_at ASC
  )
  INTO result_json
  FROM all_decisions;

  RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;
