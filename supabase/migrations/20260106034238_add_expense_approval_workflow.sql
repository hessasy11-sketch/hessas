/*
  # المرحلة 3: اعتماد المصروفات (Approval Workflow)
  
  ## الهدف
  إضافة workflow لاعتماد المصروفات فوق عتبة معينة
  
  ## المكونات
  1. حقول approval في farm_financial_ledger
  2. جدول expense_approval_thresholds (العتبات)
  3. تحديث add_ledger_entry() لتطبيق العتبة
  4. دوال الاعتماد/الرفض
  5. دوال جلب المعلقات
  6. تسجيل في Decision Queue + Executive Log
  
  ## الاستخدام
  - مصروف < 500 ريال: يُعتمد تلقائياً
  - مصروف ≥ 500 ريال: awaiting_approval
  - يُعتمد من B2F Ops Room أو GM
*/

-- =====================================================
-- 1. إضافة حقول approval إلى farm_financial_ledger
-- =====================================================
ALTER TABLE farm_financial_ledger
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' CHECK (
  approval_status IN ('approved', 'awaiting_approval', 'rejected')
),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES platform_staff(id),
ADD COLUMN IF NOT EXISTS approved_by_name text,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES platform_staff(id),
ADD COLUMN IF NOT EXISTS rejected_by_name text,
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_approval_status
  ON farm_financial_ledger(approval_status);
CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_farm_approval
  ON farm_financial_ledger(farm_id, approval_status);

-- =====================================================
-- 2. جدول العتبات (Thresholds)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_name text NOT NULL,
  threshold_amount numeric NOT NULL CHECK (threshold_amount >= 0),
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'expense', 'income')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE expense_approval_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thresholds"
  ON expense_approval_thresholds FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage thresholds"
  ON expense_approval_thresholds FOR ALL
  USING (auth.role() = 'service_role');

-- عتبة افتراضية: 500 ريال
INSERT INTO expense_approval_thresholds (
  threshold_name,
  threshold_amount,
  applies_to,
  is_active
)
VALUES (
  'عتبة المصروفات الافتراضية',
  500.00,
  'expense',
  true
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. دالة: التحقق من العتبة
-- =====================================================
CREATE OR REPLACE FUNCTION check_expense_threshold(
  p_entry_type text,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold numeric;
BEGIN
  -- جلب العتبة النشطة
  SELECT threshold_amount INTO v_threshold
  FROM expense_approval_thresholds
  WHERE is_active = true
    AND (applies_to = 'all' OR applies_to = p_entry_type)
  ORDER BY threshold_amount ASC
  LIMIT 1;
  
  -- إذا لم توجد عتبة، لا يحتاج اعتماد
  IF v_threshold IS NULL THEN
    RETURN false;
  END IF;
  
  -- التحقق من المبلغ
  RETURN p_amount >= v_threshold;
END;
$$;

-- =====================================================
-- 4. تحديث add_ledger_entry لتطبيق العتبة
-- =====================================================
DROP FUNCTION IF EXISTS add_ledger_entry(uuid, text, uuid, numeric, date, text, text, text, text, uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION add_ledger_entry(
  p_farm_id uuid,
  p_entry_type text,
  p_category_id uuid,
  p_amount numeric,
  p_entry_date date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_proof_file_url text DEFAULT NULL,
  p_proof_file_name text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_created_by_name text DEFAULT 'مدير المزرعة',
  p_task_id uuid DEFAULT NULL,
  p_task_title text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id uuid;
  v_category_name text;
  v_task_title_resolved text;
  v_requires_approval boolean;
  v_approval_status text;
  v_result json;
BEGIN
  -- جلب اسم التصنيف
  SELECT name_ar INTO v_category_name
  FROM farm_ledger_categories
  WHERE id = p_category_id;
  
  IF v_category_name IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- جلب عنوان المهمة
  IF p_task_id IS NOT NULL AND p_task_title IS NULL THEN
    SELECT title INTO v_task_title_resolved
    FROM farm_tasks
    WHERE id = p_task_id;
  ELSE
    v_task_title_resolved := p_task_title;
  END IF;
  
  -- التحقق من العتبة (فقط للمصروفات)
  IF p_entry_type = 'expense' THEN
    v_requires_approval := check_expense_threshold(p_entry_type, p_amount);
    
    IF v_requires_approval THEN
      v_approval_status := 'awaiting_approval';
    ELSE
      v_approval_status := 'approved';
    END IF;
  ELSE
    v_requires_approval := false;
    v_approval_status := 'approved';
  END IF;
  
  -- إضافة القيد
  INSERT INTO farm_financial_ledger (
    farm_id,
    entry_type,
    category_id,
    category_name,
    amount,
    entry_date,
    description,
    notes,
    proof_file_url,
    proof_file_name,
    created_by,
    created_by_name,
    task_id,
    task_title,
    requires_approval,
    approval_status,
    is_approved
  )
  VALUES (
    p_farm_id,
    p_entry_type,
    p_category_id,
    v_category_name,
    p_amount,
    p_entry_date,
    p_description,
    p_notes,
    p_proof_file_url,
    p_proof_file_name,
    p_created_by,
    p_created_by_name,
    p_task_id,
    v_task_title_resolved,
    v_requires_approval,
    v_approval_status,
    (v_approval_status = 'approved')
  )
  RETURNING id INTO v_entry_id;
  
  -- إرجاع النتيجة
  SELECT json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'requires_approval', v_requires_approval,
    'approval_status', v_approval_status,
    'message', CASE 
      WHEN v_requires_approval THEN 'تم إضافة القيد - بانتظار الاعتماد'
      ELSE 'تم إضافة القيد المالي بنجاح'
    END
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 5. دالة: اعتماد مصروف
-- =====================================================
CREATE OR REPLACE FUNCTION approve_expense(
  p_entry_id uuid,
  p_approver_id uuid,
  p_approver_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_amount numeric;
  v_category_name text;
  v_description text;
  v_decision_id uuid;
  v_result json;
BEGIN
  -- جلب بيانات المصروف
  SELECT farm_id, amount, category_name, description
  INTO v_farm_id, v_amount, v_category_name, v_description
  FROM farm_financial_ledger
  WHERE id = p_entry_id;
  
  IF v_farm_id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  -- تحديث حالة الاعتماد
  UPDATE farm_financial_ledger
  SET 
    approval_status = 'approved',
    is_approved = true,
    approved_by = p_approver_id,
    approved_by_name = p_approver_name,
    approved_at = now()
  WHERE id = p_entry_id;
  
  -- تسجيل في Decision Queue
  INSERT INTO b2b_decision_queue (
    decision_type,
    title,
    description,
    priority,
    created_by_id,
    created_by_name,
    status,
    decided_at,
    decided_by_id,
    decided_by_name,
    decision_outcome
  )
  VALUES (
    'financial_approval',
    'اعتماد مصروف: ' || v_category_name,
    format('مبلغ %s ريال - %s', v_amount, COALESCE(v_description, 'بدون وصف')),
    'medium',
    p_approver_id,
    p_approver_name,
    'approved',
    now(),
    p_approver_id,
    p_approver_name,
    'approved'
  )
  RETURNING id INTO v_decision_id;
  
  -- تسجيل في Executive Log
  INSERT INTO executive_log (
    action_type,
    action_title,
    description,
    performed_by_id,
    performed_by_name,
    metadata
  )
  VALUES (
    'expense_approved',
    'اعتماد مصروف: ' || v_category_name,
    format('تم اعتماد مصروف بقيمة %s ريال', v_amount),
    p_approver_id,
    p_approver_name,
    json_build_object(
      'entry_id', p_entry_id,
      'farm_id', v_farm_id,
      'amount', v_amount,
      'category', v_category_name,
      'decision_id', v_decision_id
    )
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم اعتماد المصروف بنجاح',
    'decision_id', v_decision_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 6. دالة: رفض مصروف
-- =====================================================
CREATE OR REPLACE FUNCTION reject_expense(
  p_entry_id uuid,
  p_rejector_id uuid,
  p_rejector_name text,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_amount numeric;
  v_category_name text;
  v_result json;
BEGIN
  -- جلب بيانات المصروف
  SELECT farm_id, amount, category_name
  INTO v_farm_id, v_amount, v_category_name
  FROM farm_financial_ledger
  WHERE id = p_entry_id;
  
  IF v_farm_id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  -- تحديث حالة الرفض
  UPDATE farm_financial_ledger
  SET 
    approval_status = 'rejected',
    is_approved = false,
    rejected_by = p_rejector_id,
    rejected_by_name = p_rejector_name,
    rejected_at = now(),
    rejection_reason = p_reason
  WHERE id = p_entry_id;
  
  -- تسجيل في Decision Queue
  INSERT INTO b2b_decision_queue (
    decision_type,
    title,
    description,
    priority,
    created_by_id,
    created_by_name,
    status,
    decided_at,
    decided_by_id,
    decided_by_name,
    decision_outcome
  )
  VALUES (
    'financial_rejection',
    'رفض مصروف: ' || v_category_name,
    format('مبلغ %s ريال - السبب: %s', v_amount, p_reason),
    'medium',
    p_rejector_id,
    p_rejector_name,
    'rejected',
    now(),
    p_rejector_id,
    p_rejector_name,
    'rejected'
  );
  
  -- تسجيل في Executive Log
  INSERT INTO executive_log (
    action_type,
    action_title,
    description,
    performed_by_id,
    performed_by_name,
    metadata
  )
  VALUES (
    'expense_rejected',
    'رفض مصروف: ' || v_category_name,
    format('تم رفض مصروف بقيمة %s ريال - السبب: %s', v_amount, p_reason),
    p_rejector_id,
    p_rejector_name,
    json_build_object(
      'entry_id', p_entry_id,
      'farm_id', v_farm_id,
      'amount', v_amount,
      'category', v_category_name,
      'reason', p_reason
    )
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم رفض المصروف'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 7. دالة: جلب المصروفات المعلقة
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_expenses(
  p_farm_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  entry_type text,
  category_name text,
  amount numeric,
  entry_date date,
  description text,
  notes text,
  created_by_name text,
  task_id uuid,
  task_title text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.farm_id,
    l.entry_type,
    l.category_name,
    l.amount,
    l.entry_date,
    l.description,
    l.notes,
    l.created_by_name,
    l.task_id,
    l.task_title,
    l.created_at
  FROM farm_financial_ledger l
  WHERE l.approval_status = 'awaiting_approval'
    AND (p_farm_id IS NULL OR l.farm_id = p_farm_id)
  ORDER BY l.amount DESC, l.created_at DESC;
END;
$$;

-- =====================================================
-- 8. دالة: إحصائيات المعلقات
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_expenses_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_pending', COUNT(*)::integer,
    'total_amount', COALESCE(SUM(amount), 0),
    'max_amount', COALESCE(MAX(amount), 0),
    'oldest_date', MIN(created_at)
  )
  INTO v_stats
  FROM farm_financial_ledger
  WHERE approval_status = 'awaiting_approval';
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- 9. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION check_expense_threshold TO authenticated;
GRANT EXECUTE ON FUNCTION check_expense_threshold TO anon;
GRANT EXECUTE ON FUNCTION add_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION add_ledger_entry TO anon;
GRANT EXECUTE ON FUNCTION approve_expense TO authenticated;
GRANT EXECUTE ON FUNCTION approve_expense TO anon;
GRANT EXECUTE ON FUNCTION reject_expense TO authenticated;
GRANT EXECUTE ON FUNCTION reject_expense TO anon;
GRANT EXECUTE ON FUNCTION get_pending_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_expenses TO anon;
GRANT EXECUTE ON FUNCTION get_pending_expenses_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_expenses_stats TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN farm_financial_ledger.approval_status IS 'حالة الاعتماد: approved, awaiting_approval, rejected';
COMMENT ON COLUMN farm_financial_ledger.requires_approval IS 'هل يحتاج اعتماد بناءً على العتبة';
COMMENT ON TABLE expense_approval_thresholds IS 'عتبات اعتماد المصروفات';
COMMENT ON FUNCTION approve_expense IS 'اعتماد مصروف ويسجل في Decision Queue + Executive Log';
COMMENT ON FUNCTION reject_expense IS 'رفض مصروف مع السبب';
COMMENT ON FUNCTION get_pending_expenses IS 'جلب المصروفات بانتظار الاعتماد';
