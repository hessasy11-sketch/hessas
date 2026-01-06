/*
  # المرحلة 3: ربط القرارات بالتنفيذ التلقائي (Controlled Execution)
  
  1. دوال التنفيذ:
    - `execute_change_farm_manager` - تغيير مدير مزرعة
    - `execute_suspend_bookings` - إيقاف حجوزات
    - `execute_cancel_auction` - إلغاء مزاد
    - `execute_approve_expense` - اعتماد مصروف
  
  2. دالة رئيسية:
    - `execute_approved_decision` - تنفيذ القرار المعتمد
  
  3. التكامل:
    - تعديل `approve_decision_b2f` لتنفيذ القرار تلقائياً
    - تسجيل التنفيذ في executive_logs
  
  📌 التنفيذ لا يتم إلا بعد الموافقة
*/

-- =======================
-- 1. تنفيذ: تغيير مدير مزرعة
-- =======================
CREATE OR REPLACE FUNCTION execute_change_farm_manager(
  p_farm_id uuid,
  p_new_manager_id uuid,
  p_decision_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_manager_id uuid;
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- جلب المدير القديم
  SELECT farm_manager_id, name INTO v_old_manager_id, v_farm_name
  FROM b2f_farms WHERE id = p_farm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;
  
  -- تحديث المدير
  UPDATE b2f_farms
  SET 
    farm_manager_id = p_new_manager_id,
    updated_at = now()
  WHERE id = p_farm_id;
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_change_manager',
    p_farm_id,
    p_decision_id,
    jsonb_build_object(
      'old_manager_id', v_old_manager_id,
      'new_manager_id', p_new_manager_id,
      'farm_name', v_farm_name
    ),
    p_performed_by,
    'success',
    format('تم تغيير مدير مزرعة %s بنجاح', v_farm_name)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'old_manager_id', v_old_manager_id,
    'new_manager_id', p_new_manager_id,
    'message', 'Manager changed successfully'
  );
END;
$$;

-- =======================
-- 2. تنفيذ: إيقاف حجوزات
-- =======================
CREATE OR REPLACE FUNCTION execute_suspend_bookings(
  p_farm_id uuid,
  p_decision_id uuid,
  p_performed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_affected_count int;
BEGIN
  -- جلب اسم المزرعة
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;
  
  -- إيقاف المزرعة (تعطيل الحجوزات الجديدة)
  UPDATE b2f_farms
  SET 
    status = 'suspended',
    updated_at = now()
  WHERE id = p_farm_id;
  
  -- إلغاء الحجوزات المعلقة (pending)
  UPDATE b2f_sales_requests
  SET 
    status = 'cancelled',
    admin_notes = COALESCE(admin_notes || E'\n', '') || format('تم الإلغاء بسبب: %s', COALESCE(p_reason, 'إيقاف المزرعة'))
  WHERE 
    opportunity_id IN (
      SELECT id FROM b2f_opportunities WHERE farm_id = p_farm_id
    )
    AND status = 'pending'
  RETURNING * INTO v_affected_count;
  
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_suspend_bookings',
    p_farm_id,
    p_decision_id,
    jsonb_build_object(
      'farm_name', v_farm_name,
      'affected_bookings', v_affected_count,
      'reason', p_reason
    ),
    p_performed_by,
    'success',
    format('تم إيقاف حجوزات مزرعة %s وإلغاء %s حجز معلق', v_farm_name, v_affected_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'affected_bookings', v_affected_count,
    'message', 'Bookings suspended successfully'
  );
END;
$$;

-- =======================
-- 3. تنفيذ: إلغاء مزاد
-- =======================
CREATE OR REPLACE FUNCTION execute_cancel_auction(
  p_auction_id uuid,
  p_decision_id uuid,
  p_performed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction_title text;
  v_old_status text;
BEGIN
  -- جلب بيانات المزاد
  SELECT title, status INTO v_auction_title, v_old_status
  FROM auctions WHERE id = p_auction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Auction not found'
    );
  END IF;
  
  -- إلغاء المزاد
  UPDATE auctions
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_auction_id;
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_cancel_auction',
    p_decision_id,
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'old_status', v_old_status,
      'reason', p_reason
    ),
    p_performed_by,
    'success',
    format('تم إلغاء المزاد "%s" بنجاح', v_auction_title)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'auction_title', v_auction_title,
    'old_status', v_old_status,
    'message', 'Auction cancelled successfully'
  );
END;
$$;

-- =======================
-- 4. تنفيذ: اعتماد مصروف
-- =======================
CREATE OR REPLACE FUNCTION execute_approve_expense(
  p_expense_id uuid,
  p_decision_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense record;
  v_farm_name text;
BEGIN
  -- جلب بيانات المصروف
  SELECT 
    fe.*,
    bf.name as farm_name
  INTO v_expense
  FROM farm_expenses fe
  JOIN b2f_farms bf ON fe.farm_id = bf.id
  WHERE fe.id = p_expense_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Expense not found'
    );
  END IF;
  
  -- اعتماد المصروف
  UPDATE farm_expenses
  SET 
    approval_status = 'approved',
    approved_by = p_performed_by,
    approved_at = now()
  WHERE id = p_expense_id;
  
  -- تسجيل في السجل المالي
  INSERT INTO farm_financial_ledger (
    farm_id,
    entry_type,
    amount,
    description,
    category,
    recorded_by
  ) VALUES (
    v_expense.farm_id,
    'expense',
    v_expense.amount,
    v_expense.description,
    v_expense.category,
    p_performed_by
  );
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_approve_expense',
    v_expense.farm_id,
    p_decision_id,
    jsonb_build_object(
      'expense_id', p_expense_id,
      'amount', v_expense.amount,
      'category', v_expense.category,
      'description', v_expense.description
    ),
    p_performed_by,
    'success',
    format('تم اعتماد مصروف بقيمة %s ر.س لمزرعة %s', v_expense.amount, v_farm_name)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'expense_id', p_expense_id,
    'amount', v_expense.amount,
    'farm_name', v_farm_name,
    'message', 'Expense approved successfully'
  );
END;
$$;

-- =======================
-- 5. الدالة الرئيسية: تنفيذ القرار المعتمد
-- =======================
CREATE OR REPLACE FUNCTION execute_approved_decision(
  p_decision_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_execution_result jsonb;
BEGIN
  -- جلب بيانات القرار
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found'
    );
  END IF;
  
  -- التحقق من أن القرار معتمد
  IF v_decision.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not approved yet'
    );
  END IF;
  
  -- تنفيذ حسب نوع القرار
  CASE v_decision.decision_type
    WHEN 'change_farm_manager' THEN
      v_execution_result := execute_change_farm_manager(
        (v_decision.decision_data->>'farm_id')::uuid,
        (v_decision.decision_data->>'new_manager_id')::uuid,
        p_decision_id,
        p_performed_by
      );
    
    WHEN 'suspend_bookings' THEN
      v_execution_result := execute_suspend_bookings(
        (v_decision.decision_data->>'farm_id')::uuid,
        p_decision_id,
        p_performed_by,
        v_decision.decision_data->>'reason'
      );
    
    WHEN 'cancel_auction' THEN
      v_execution_result := execute_cancel_auction(
        (v_decision.decision_data->>'auction_id')::uuid,
        p_decision_id,
        p_performed_by,
        v_decision.decision_data->>'reason'
      );
    
    WHEN 'approve_expense' THEN
      v_execution_result := execute_approve_expense(
        (v_decision.decision_data->>'expense_id')::uuid,
        p_decision_id,
        p_performed_by
      );
    
    ELSE
      -- قرار غير معروف
      v_execution_result := jsonb_build_object(
        'success', false,
        'error', format('Unknown decision type: %s', v_decision.decision_type)
      );
  END CASE;
  
  -- تحديث حالة القرار
  IF v_execution_result->>'success' = 'true' THEN
    UPDATE decision_queue
    SET 
      executed = true,
      executed_at = now(),
      execution_result = v_execution_result
    WHERE id = p_decision_id;
  END IF;
  
  RETURN v_execution_result;
END;
$$;

-- =======================
-- 6. تعديل approve_decision_b2f لتنفيذ القرار تلقائياً
-- =======================
CREATE OR REPLACE FUNCTION approve_decision_b2f(
  p_decision_id uuid,
  p_staff_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_execution_result jsonb;
BEGIN
  -- جلب بيانات القرار
  SELECT * INTO v_decision FROM decision_queue WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision not found');
  END IF;
  
  IF v_decision.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision already processed');
  END IF;
  
  -- اعتماد القرار
  UPDATE decision_queue
  SET 
    status = 'approved',
    reviewed_by = p_staff_id,
    reviewed_at = now(),
    review_notes = p_notes
  WHERE id = p_decision_id;
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'approve_decision',
    v_decision.farm_id,
    p_decision_id,
    jsonb_build_object(
      'decision_type', v_decision.decision_type,
      'priority', v_decision.priority,
      'approval_notes', p_notes
    ),
    p_staff_id,
    'success',
    'تمت الموافقة على القرار'
  );
  
  -- 🔥 تنفيذ القرار تلقائياً
  v_execution_result := execute_approved_decision(p_decision_id, p_staff_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'execution', v_execution_result
  );
END;
$$;
