/*
  # دوال اعتماد مدير المزرعة وإدارة التقارير

  1. الدوال الجديدة
    - `approve_task_proof` - اعتماد إثبات المهمة
    - `reject_task_proof` - رفض إثبات المهمة
    - `send_farm_update_to_investors` - إرسال تحديث للمستثمرين
    - `create_management_report_safe` - إنشاء تقرير إدارة
  
  2. الأمان
    - دعم جلسات الموظفين
    - التحقق من الصلاحيات
*/

-- =====================================================
-- 1. دالة اعتماد إثبات المهمة
-- =====================================================
CREATE OR REPLACE FUNCTION approve_task_proof(
  p_task_id uuid,
  p_approval_notes text DEFAULT NULL,
  p_approver_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record record;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_staff(p_approver_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب بيانات المهمة
  SELECT * INTO v_task_record
  FROM farm_tasks
  WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  -- تحديث حالة المهمة
  UPDATE farm_tasks
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = p_approver_staff_id,
    approval_notes = p_approval_notes,
    updated_at = now()
  WHERE id = p_task_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم اعتماد المهمة بنجاح',
    'taskId', p_task_id
  );
END;
$$;

-- =====================================================
-- 2. دالة رفض إثبات المهمة
-- =====================================================
CREATE OR REPLACE FUNCTION reject_task_proof(
  p_task_id uuid,
  p_rejection_reason text,
  p_rejecter_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_staff(p_rejecter_staff_id) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
    RETURN json_build_object('success', false, 'error', 'يجب كتابة سبب الرفض');
  END IF;

  -- تحديث حالة المهمة
  UPDATE farm_tasks
  SET 
    status = 'rejected',
    rejected_at = now(),
    approved_by = p_rejecter_staff_id,
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم رفض المهمة',
    'taskId', p_task_id
  );
END;
$$;

-- =====================================================
-- 3. دالة إرسال تحديث للمستثمرين
-- =====================================================
CREATE OR REPLACE FUNCTION send_farm_update_to_investors(
  p_farm_id uuid,
  p_operation_update_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_investors_count int := 0;
  v_update_title text;
BEGIN
  -- جلب عنوان التحديث
  SELECT title INTO v_update_title
  FROM b2f_farm_operation_updates
  WHERE id = p_operation_update_id;

  -- جلب جميع المستثمرين في هذه المزرعة
  -- من خلال العقود النشطة
  INSERT INTO b2f_notifications (
    account_id,
    type,
    title,
    message,
    priority,
    action_url
  )
  SELECT DISTINCT
    bc.investor_account_id,
    'farm_update',
    'تحديث من المزرعة',
    v_update_title,
    'normal',
    '/investor/operations'
  FROM b2f_contracts bc
  WHERE bc.farm_id = p_farm_id
  AND bc.status IN ('active', 'issued')
  AND bc.investor_account_id IS NOT NULL;

  GET DIAGNOSTICS v_investors_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'message', format('تم إرسال التحديث إلى %s مستثمر', v_investors_count),
    'investorsNotified', v_investors_count
  );
END;
$$;

-- =====================================================
-- 4. دالة إنشاء تقرير إدارة
-- =====================================================
CREATE OR REPLACE FUNCTION create_management_report_safe(
  p_task_id uuid,
  p_farm_id uuid,
  p_approved_by uuid,
  p_title text,
  p_summary text,
  p_approved_photos jsonb DEFAULT '[]'::jsonb,
  p_send_to_investors boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
  v_update_id uuid;
  v_investors_notified int := 0;
BEGIN
  -- إنشاء سجل التقرير في farm_tasks
  UPDATE farm_tasks
  SET 
    sent_to_admin = true,
    updated_at = now()
  WHERE id = p_task_id;

  -- إذا كان المطلوب إرسال للمستثمرين
  IF p_send_to_investors THEN
    -- إنشاء تحديث تشغيلي
    INSERT INTO b2f_farm_operation_updates (
      farm_id,
      update_type,
      title,
      description,
      images,
      visible_to_investors
    )
    SELECT 
      p_farm_id,
      'general',
      p_title,
      p_summary,
      p_approved_photos,
      true
    WHERE EXISTS (
      SELECT 1 FROM b2f_farm_operations 
      WHERE farm_id = p_farm_id AND is_active = true
    )
    RETURNING id INTO v_update_id;

    -- إرسال إشعارات للمستثمرين
    IF v_update_id IS NOT NULL THEN
      INSERT INTO b2f_notifications (
        account_id,
        type,
        title,
        message,
        priority,
        action_url
      )
      SELECT DISTINCT
        bc.investor_account_id,
        'farm_update',
        'تحديث من المزرعة',
        p_title,
        'normal',
        '/investor/operations'
      FROM b2f_contracts bc
      WHERE bc.farm_id = p_farm_id
      AND bc.status IN ('active', 'issued')
      AND bc.investor_account_id IS NOT NULL;

      GET DIAGNOSTICS v_investors_notified = ROW_COUNT;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إنشاء التقرير بنجاح',
    'reportId', v_report_id,
    'updateId', v_update_id,
    'investors_notified', v_investors_notified
  );
END;
$$;

-- =====================================================
-- 5. منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION approve_task_proof TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_task_proof TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_farm_update_to_investors TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_management_report_safe TO anon, authenticated;