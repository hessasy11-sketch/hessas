/*
  # المرحلة 2: ربط المصروف بالمهمة
  
  ## الهدف
  ربط القيود المالية بمهام التشغيل
  
  ## التعديلات
  1. إضافة task_id إلى farm_financial_ledger
  2. إضافة task_title للعرض السريع
  3. تحديث الدوال لدعم task_id
  4. إضافة دالة للحصول على مصروفات المهمة
  
  ## الاستخدام
  - من المهام: إضافة مصروف مرتبط عند الإغلاق
  - من الحاسبة: اختيار مهمة (اختياري)
*/

-- =====================================================
-- 1. إضافة حقول task إلى farm_financial_ledger
-- =====================================================
ALTER TABLE farm_financial_ledger
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES farm_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS task_title text;

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_farm_financial_ledger_task_id 
  ON farm_financial_ledger(task_id);

-- =====================================================
-- 2. حذف الدالة القديمة وإنشاء واحدة جديدة
-- =====================================================
DROP FUNCTION IF EXISTS get_farm_ledger(uuid, text, integer, integer, integer, integer);

CREATE OR REPLACE FUNCTION get_farm_ledger(
  p_farm_id uuid,
  p_entry_type text DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  entry_type text,
  category_id uuid,
  category_name text,
  amount numeric,
  entry_date date,
  description text,
  notes text,
  proof_file_url text,
  proof_file_name text,
  created_by uuid,
  created_by_name text,
  task_id uuid,
  task_title text,
  is_approved boolean,
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
    l.category_id,
    l.category_name,
    l.amount,
    l.entry_date,
    l.description,
    l.notes,
    l.proof_file_url,
    l.proof_file_name,
    l.created_by,
    l.created_by_name,
    l.task_id,
    l.task_title,
    l.is_approved,
    l.created_at
  FROM farm_financial_ledger l
  WHERE l.farm_id = p_farm_id
    AND (p_entry_type IS NULL OR l.entry_type = p_entry_type)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM l.entry_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM l.entry_date) = p_month)
  ORDER BY l.entry_date DESC, l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3. حذف وإعادة إنشاء add_ledger_entry
-- =====================================================
DROP FUNCTION IF EXISTS add_ledger_entry(uuid, text, uuid, numeric, date, text, text, text, text, uuid, text);

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
  v_result json;
BEGIN
  -- جلب اسم التصنيف
  SELECT name_ar INTO v_category_name
  FROM farm_ledger_categories
  WHERE id = p_category_id;
  
  IF v_category_name IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- جلب عنوان المهمة إذا كان task_id موجود ولم يُرسَل task_title
  IF p_task_id IS NOT NULL AND p_task_title IS NULL THEN
    SELECT title INTO v_task_title_resolved
    FROM farm_tasks
    WHERE id = p_task_id;
  ELSE
    v_task_title_resolved := p_task_title;
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
    true
  )
  RETURNING id INTO v_entry_id;
  
  -- إرجاع النتيجة
  SELECT json_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'message', 'تم إضافة القيد المالي بنجاح'
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
-- 4. دالة: جلب مصروفات مهمة
-- =====================================================
CREATE OR REPLACE FUNCTION get_task_expenses(
  p_task_id uuid
)
RETURNS TABLE (
  id uuid,
  entry_type text,
  category_name text,
  amount numeric,
  entry_date date,
  description text,
  created_by_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.entry_type,
    l.category_name,
    l.amount,
    l.entry_date,
    l.description,
    l.created_by_name,
    l.created_at
  FROM farm_financial_ledger l
  WHERE l.task_id = p_task_id
  ORDER BY l.created_at DESC;
END;
$$;

-- =====================================================
-- 5. دالة: إحصائيات مصروفات المهمة
-- =====================================================
CREATE OR REPLACE FUNCTION get_task_expenses_summary(
  p_task_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary json;
BEGIN
  SELECT json_build_object(
    'total_expenses', COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0),
    'total_income', COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0),
    'net_cost', COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE -amount END), 0),
    'entries_count', COUNT(*)::integer
  )
  INTO v_summary
  FROM farm_financial_ledger
  WHERE task_id = p_task_id;
  
  RETURN COALESCE(v_summary, json_build_object(
    'total_expenses', 0,
    'total_income', 0,
    'net_cost', 0,
    'entries_count', 0
  ));
END;
$$;

-- =====================================================
-- 6. دالة: جلب المهام المتاحة للربط
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_tasks_for_linking(
  p_farm_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  due_date date,
  assigned_to_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to_name
  FROM farm_tasks t
  WHERE t.farm_id = p_farm_id
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY 
    CASE t.status
      WHEN 'in_progress' THEN 1
      WHEN 'pending' THEN 2
      WHEN 'completed' THEN 3
      ELSE 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
END;
$$;

-- =====================================================
-- 7. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION add_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION add_ledger_entry TO anon;
GRANT EXECUTE ON FUNCTION get_farm_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_ledger TO anon;
GRANT EXECUTE ON FUNCTION get_task_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_expenses TO anon;
GRANT EXECUTE ON FUNCTION get_task_expenses_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_expenses_summary TO anon;
GRANT EXECUTE ON FUNCTION get_farm_tasks_for_linking TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_tasks_for_linking TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN farm_financial_ledger.task_id IS 'ربط اختياري بمهمة تشغيلية';
COMMENT ON COLUMN farm_financial_ledger.task_title IS 'عنوان المهمة للعرض السريع';

COMMENT ON FUNCTION get_task_expenses IS 'جلب جميع المصروفات والمداخيل المرتبطة بمهمة';
COMMENT ON FUNCTION get_task_expenses_summary IS 'ملخص مالي للمهمة';
COMMENT ON FUNCTION get_farm_tasks_for_linking IS 'جلب قائمة المهام المتاحة للربط بالمصروفات';
