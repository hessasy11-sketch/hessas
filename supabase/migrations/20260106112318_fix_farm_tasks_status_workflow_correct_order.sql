/*
  # Fix farm_tasks Status Workflow - Correct Order

  1. Steps
    - Drop old constraint FIRST
    - Migrate existing data
    - Add new constraint with unified workflow
    - Add kickstart_generated to farms
    - Create activation and kickstart functions
*/

-- Step 1: Drop old constraint FIRST
ALTER TABLE farm_tasks
DROP CONSTRAINT IF EXISTS farm_tasks_status_check;

-- Step 2: Migrate existing data
UPDATE farm_tasks
SET status = 'new'
WHERE status = 'pending';

UPDATE farm_tasks
SET status = 'rejected'
WHERE status = 'cancelled';

-- Step 3: Add new constraint with unified workflow
ALTER TABLE farm_tasks
ADD CONSTRAINT farm_tasks_status_check 
CHECK (status IN ('new', 'in_progress', 'submitted', 'approved', 'rejected'));

-- Step 4: Add kickstart tracking to farms
ALTER TABLE b2f_farms
ADD COLUMN IF NOT EXISTS kickstart_generated boolean DEFAULT false;

-- ===============================
-- Generate Kickstart Tasks (10 Essential Tasks)
-- ===============================

CREATE OR REPLACE FUNCTION generate_kickstart_tasks(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_manager_id uuid;
  v_tasks_created integer := 0;
BEGIN
  -- Get farm manager
  SELECT farm_manager_id INTO v_farm_manager_id
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_manager_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm has no manager assigned'
    );
  END IF;

  -- Check if kickstart already generated
  IF EXISTS (
    SELECT 1 FROM b2f_farms 
    WHERE id = p_farm_id AND kickstart_generated = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kickstart tasks already generated for this farm'
    );
  END IF;

  -- Task 1: فحص نظام الري الأساسي
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'فحص نظام الري الأساسي',
    'فحص شامل لنظام الري: الأنابيب، الرشاشات، المضخات، والتأكد من عدم وجود تسريبات',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '3 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 2: تفقد التربة والأسمدة
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'تفقد التربة والأسمدة',
    'فحص جودة التربة، مستوى الرطوبة، وتقييم احتياجات التسميد',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '3 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 3: فحص الأشجار والنباتات
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'فحص الأشجار والنباتات',
    'تفقد صحة النباتات، البحث عن آفات أو أمراض، وتقييم النمو العام',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '4 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 4: تنظيف وترتيب المزرعة
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'تنظيف وترتيب المزرعة',
    'إزالة الأعشاب الضارة، تنظيف الممرات، وترتيب منطقة العمل',
    'new',
    'normal',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '5 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 5: صيانة المعدات
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'صيانة المعدات والآلات',
    'فحص وصيانة جميع المعدات الزراعية، الأدوات، والآلات',
    'new',
    'normal',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '7 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 6: فحص نظام الأمن والمراقبة
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'فحص نظام الأمن والمراقبة',
    'التأكد من عمل الكاميرات، الإضاءة، والأسوار بشكل صحيح',
    'new',
    'normal',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '5 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 7: جرد المخزون
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'جرد المخزون الأولي',
    'إحصاء جميع المواد: الأسمدة، الأدوات، قطع الغيار، والمستلزمات',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '4 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 8: تحديث سجلات الإنتاج
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'تحديث سجلات الإنتاج',
    'توثيق الحالة الحالية وإعداد نظام تسجيل منتظم للإنتاج',
    'new',
    'normal',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '7 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 9: تدريب الفريق
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'تدريب الفريق على البروتوكولات',
    'تدريب جميع أعضاء الفريق على إجراءات العمل القياسية والسلامة',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '5 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Task 10: إعداد تقرير الحالة الأولي
  INSERT INTO farm_tasks (
    farm_id, title, description, status, priority,
    assigned_to, created_by, due_date
  ) VALUES (
    p_farm_id,
    'إعداد تقرير الحالة الأولي',
    'إعداد تقرير شامل عن وضع المزرعة بعد إتمام جميع الفحوصات',
    'new',
    'high',
    v_farm_manager_id,
    v_farm_manager_id,
    CURRENT_DATE + interval '10 days'
  );
  v_tasks_created := v_tasks_created + 1;

  -- Mark kickstart as generated
  UPDATE b2f_farms
  SET kickstart_generated = true, updated_at = now()
  WHERE id = p_farm_id;

  RETURN jsonb_build_object(
    'success', true,
    'tasks_created', v_tasks_created,
    'message', 'تم إنشاء حزمة البدء بنجاح - 10 مهام أساسية'
  );
END;
$$;

-- ===============================
-- Activate Farm (with Kickstart)
-- ===============================

CREATE OR REPLACE FUNCTION activate_farm(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_kickstart_result jsonb;
BEGIN
  -- Get current farm status
  SELECT status INTO v_current_status
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  IF v_current_status = 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm is already active'
    );
  END IF;

  -- Activate the farm
  UPDATE b2f_farms
  SET 
    status = 'active',
    updated_at = now()
  WHERE id = p_farm_id;

  -- Generate kickstart tasks
  SELECT generate_kickstart_tasks(p_farm_id) INTO v_kickstart_result;

  IF NOT (v_kickstart_result->>'success')::boolean THEN
    -- Rollback activation if kickstart fails
    UPDATE b2f_farms
    SET status = v_current_status
    WHERE id = p_farm_id;
    
    RETURN v_kickstart_result;
  END IF;

  -- Log activation
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    action_data,
    result,
    notes
  ) VALUES (
    'farm_activated',
    p_farm_id,
    jsonb_build_object(
      'previous_status', v_current_status,
      'kickstart_tasks', v_kickstart_result->'tasks_created'
    ),
    'success',
    'تم تفعيل المزرعة وإنشاء حزمة البدء'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تفعيل المزرعة بنجاح',
    'farm_id', p_farm_id,
    'status', 'active',
    'kickstart_result', v_kickstart_result
  );
END;
$$;

-- ===============================
-- RPC for expense approval request
-- ===============================

CREATE OR REPLACE FUNCTION request_expense_approval(
  p_expense_id uuid,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense RECORD;
  v_decision_id uuid;
  v_required_roles text[];
BEGIN
  -- Get expense details
  SELECT * INTO v_expense
  FROM farm_expenses
  WHERE id = p_expense_id;

  IF v_expense.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Expense not found'
    );
  END IF;

  IF v_expense.approval_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Expense is not in pending status'
    );
  END IF;

  -- Determine required roles based on amount
  IF v_expense.amount < 5000 THEN
    v_required_roles := ARRAY['super_admin', 'b2f_assistant'];
  ELSE
    v_required_roles := ARRAY['super_admin'];
  END IF;

  -- Create decision
  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    expense_amount,
    expense_description,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes
  ) VALUES (
    'approve_expense',
    v_expense.farm_id,
    v_expense.amount,
    v_expense.description,
    jsonb_build_object(
      'expense_id', v_expense.id,
      'category', v_expense.category
    ),
    'pending',
    CASE
      WHEN v_expense.amount >= 10000 THEN 'urgent'
      WHEN v_expense.amount >= 5000 THEN 'high'
      ELSE 'normal'
    END,
    p_requested_by,
    v_required_roles,
    'طلب اعتماد مصروف: ' || v_expense.description
  )
  RETURNING id INTO v_decision_id;

  -- Update expense status
  UPDATE farm_expenses
  SET 
    approval_status = 'pending_approval',
    updated_at = now()
  WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message', 'تم إرسال طلب الاعتماد بنجاح'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_farm(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_kickstart_tasks(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION request_expense_approval(uuid, uuid) TO anon, authenticated, service_role;
