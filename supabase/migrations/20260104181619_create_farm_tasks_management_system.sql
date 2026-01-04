/*
  # نظام إدارة مهام المزرعة واعتمادات الاستثمار

  1. الجداول الجديدة
    - `farm_tasks` - مهام المزرعة للمشرفين
    - `task_proof_attachments` - مرفقات الإثباتات
  
  2. التحديثات
    - تحديث `task_proofs` لدعم الملاحظات
    - إضافة سياسات RLS
  
  3. الدوال
    - `approve_farm_task` - اعتماد مهمة مزرعة
    - `reject_farm_task` - رفض مهمة مزرعة
*/

-- =====================================================
-- 1. إنشاء جدول farm_tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'general',
  
  -- التكليف
  created_by uuid REFERENCES platform_staff(id),
  created_by_name text,
  assigned_to uuid REFERENCES platform_staff(id),
  assigned_to_name text,
  
  -- الحالة
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'medium',
  
  -- التواريخ
  due_date timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  
  -- الاعتماد
  approved_by uuid REFERENCES platform_staff(id),
  approval_notes text,
  rejection_reason text,
  
  -- التحويل لتحديثات المستثمرين
  converted_to_update boolean DEFAULT false,
  operation_update_id uuid,
  
  -- الإشعارات
  sent_to_admin boolean DEFAULT false,
  admin_report_id uuid,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT farm_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT farm_tasks_type_check CHECK (type IN ('general', 'irrigation', 'fertilization', 'pest_control', 'maintenance', 'harvesting', 'inspection')),
  CONSTRAINT farm_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- =====================================================
-- 2. تحديث جدول task_proofs لدعم الملاحظات
-- =====================================================
ALTER TABLE task_proofs 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- =====================================================
-- 3. إنشاء جدول task_proof_attachments
-- =====================================================
CREATE TABLE IF NOT EXISTS task_proof_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES task_proofs(id) ON DELETE CASCADE NOT NULL,
  task_id uuid NOT NULL,
  url text NOT NULL,
  filename text NOT NULL,
  file_type text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. الفهارس
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_farm_tasks_farm_id ON farm_tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_status ON farm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_assigned_to ON farm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_proof_attachments_proof_id ON task_proof_attachments(proof_id);
CREATE INDEX IF NOT EXISTS idx_task_proof_attachments_task_id ON task_proof_attachments(task_id);

-- =====================================================
-- 5. دالة اعتماد المهمة
-- =====================================================
CREATE OR REPLACE FUNCTION approve_farm_task(
  p_task_id uuid,
  p_approver_id uuid,
  p_notes text DEFAULT NULL,
  p_convert_to_update boolean DEFAULT false,
  p_send_to_admin boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record record;
  v_update_id uuid;
BEGIN
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
    approved_by = p_approver_id,
    approval_notes = p_notes,
    converted_to_update = p_convert_to_update,
    sent_to_admin = p_send_to_admin,
    updated_at = now()
  WHERE id = p_task_id;
  
  -- إذا كان التحويل لتحديث مطلوب
  IF p_convert_to_update THEN
    -- سيتم إضافة المنطق لاحقاً
    NULL;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم اعتماد المهمة بنجاح',
    'taskId', p_task_id
  );
END;
$$;

-- =====================================================
-- 6. دالة رفض المهمة
-- =====================================================
CREATE OR REPLACE FUNCTION reject_farm_task(
  p_task_id uuid,
  p_rejecter_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة المهمة
  UPDATE farm_tasks
  SET 
    status = 'rejected',
    rejected_at = now(),
    approved_by = p_rejecter_id,
    rejection_reason = p_reason,
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
-- 7. سياسات RLS
-- =====================================================
ALTER TABLE farm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_proof_attachments ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة المهام
CREATE POLICY "Anyone can view farm tasks"
  ON farm_tasks FOR SELECT
  TO public
  USING (true);

-- الموظفون يمكنهم إدارة المهام
CREATE POLICY "Staff can manage farm tasks"
  ON farm_tasks FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager', 'farm_manager', 'operations_manager', 'b2f_manager')
    )
  );

-- السماح للجميع بقراءة المرفقات
CREATE POLICY "Anyone can view attachments"
  ON task_proof_attachments FOR SELECT
  TO public
  USING (true);

-- الموظفون يمكنهم إدارة المرفقات
CREATE POLICY "Staff can manage attachments"
  ON task_proof_attachments FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.is_active = true
    )
  );

-- =====================================================
-- 8. منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION approve_farm_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_farm_task TO anon, authenticated;

-- =====================================================
-- 9. تحديث التواريخ تلقائياً
-- =====================================================
CREATE OR REPLACE FUNCTION update_farm_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farm_tasks_updated_at
  BEFORE UPDATE ON farm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_tasks_updated_at();