-- إصلاح دالة create_management_report_safe لاستخدام الأعمدة الصحيحة

CREATE OR REPLACE FUNCTION create_management_report_safe(
  p_task_id uuid,
  p_farm_id uuid,
  p_approved_by uuid,
  p_title text,
  p_summary text,
  p_approved_photos jsonb,
  p_send_to_investors boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
  v_operation_id uuid;
  v_task record;
  v_farm record;
  v_investor_count int := 0;
BEGIN
  -- منع التكرار
  IF EXISTS (
    SELECT 1 FROM management_reports
    WHERE task_id = p_task_id AND report_type = 'task_completion'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم إنشاء تقرير لهذه المهمة مسبقاً');
  END IF;

  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;

  SELECT * INTO v_farm FROM b2f_farms WHERE id = p_farm_id;

  -- إنشاء التقرير (استخدام selected_photos بدلاً من approved_photos)
  INSERT INTO management_reports (
    farm_id, task_id, report_type, title, summary,
    selected_photos, approved_by, approved_at, priority, status,
    sent_to_admin, sent_at, created_by_name
  )
  VALUES (
    p_farm_id, p_task_id, 'task_completion', p_title, p_summary,
    p_approved_photos, p_approved_by, now(), 'normal', 'sent_to_admin',
    true, now(), 'مدير المزرعة'
  )
  RETURNING id INTO v_report_id;

  -- Timeline
  INSERT INTO unified_timeline (
    farm_id, task_id, report_id, event_type,
    actor_id, actor_name, actor_role, description
  )
  VALUES (
    p_farm_id, p_task_id, v_report_id, 'report_created',
    p_approved_by, 'مدير المزرعة', 'farm_manager', 'تم إنشاء تقرير توثيقي معتمد'
  );

  -- إرسال للمستثمرين
  IF p_send_to_investors AND v_task.type IN ('irrigation', 'maintenance', 'pest_control', 'harvest') THEN

    INSERT INTO b2f_farm_operations (
      farm_id, operation_type, title, description,
      status, scheduled_date, completed_date,
      photos, notes, metadata
    )
    VALUES (
      p_farm_id, v_task.type, v_task.title, p_summary,
      'completed', v_task.created_at, now(),
      p_approved_photos, 'عملية معتمدة من إدارة المزرعة',
      jsonb_build_object('source', 'approved_task', 'task_id', p_task_id, 'report_id', v_report_id)
    )
    RETURNING id INTO v_operation_id;

    UPDATE management_reports SET operation_id = v_operation_id WHERE id = v_report_id;

    INSERT INTO investor_operations (
      investor_account_id, operation_id, farm_id,
      contract_id, operation_type, trees_affected, status, notification_sent
    )
    SELECT
      c.investor_account_id, v_operation_id, c.farm_id,
      c.id, v_task.type, c.tree_count, 'completed', true
    FROM b2f_contracts c
    WHERE c.farm_id = p_farm_id AND c.status = 'active' AND c.operation_status = 'active';

    GET DIAGNOSTICS v_investor_count = ROW_COUNT;

    INSERT INTO unified_timeline (
      farm_id, operation_id, report_id, event_type,
      actor_id, actor_name, actor_role, description, metadata
    )
    VALUES (
      p_farm_id, v_operation_id, v_report_id, 'operation_sent_to_investors',
      p_approved_by, 'مدير المزرعة', 'farm_manager',
      format('تم إرسال العملية إلى %s مستثمر', v_investor_count),
      jsonb_build_object('investor_count', v_investor_count)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'report_id', v_report_id,
    'operation_id', v_operation_id, 'investors_notified', v_investor_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_management_report_safe TO authenticated, anon;
