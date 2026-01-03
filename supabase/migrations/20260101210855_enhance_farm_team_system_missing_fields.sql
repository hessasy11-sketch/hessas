/*
  # تحسين نظام المشرفين والمهام - إضافة الحقول الناقصة
  
  إضافة الحقول المطلوبة للنظام الجديد
*/

-- =====================================================
-- 1. تحسين جدول farm_tasks
-- =====================================================

-- إضافة الحقول الناقصة
DO $$ 
BEGIN
  -- أسماء المكلفين
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'assigned_to_name'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN assigned_to_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN created_by_name text;
  END IF;
  
  -- معلومات الاعتماد
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN approved_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN rejected_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'rejected_by'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN rejected_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN approval_notes text;
  END IF;
  
  -- معلومات التحويل
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'converted_to_update'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN converted_to_update boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'operation_update_id'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN operation_update_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'sent_to_admin'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN sent_to_admin boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'farm_tasks' AND column_name = 'management_report_id'
  ) THEN
    ALTER TABLE farm_tasks ADD COLUMN management_report_id uuid;
  END IF;
END $$;

-- =====================================================
-- 2. تحسين جدول task_proofs
-- =====================================================

DO $$ 
BEGIN
  -- اسم المشرف
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'supervisor_name'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN supervisor_name text;
  END IF;
  
  -- حالة الإثبات
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'status'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
  
  -- مراجعة الإثبات
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN review_notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN reviewed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_proofs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE task_proofs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- =====================================================
-- 3. تحسين جدول management_reports
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'management_reports' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN created_by_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'management_reports' AND column_name = 'priority'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- =====================================================
-- 4. إنشاء Storage Bucket للصور
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-task-proofs', 'farm-task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين
DO $$
BEGIN
  -- حذف السياسات القديمة إن وجدت
  DROP POLICY IF EXISTS "المشرفون يرفعون إثباتات" ON storage.objects;
  DROP POLICY IF EXISTS "الجميع يرى الإثباتات المعتمدة" ON storage.objects;
  DROP POLICY IF EXISTS "المدراء يحذفون إثباتات مزارعهم" ON storage.objects;
END $$;

-- السماح للمشرفين برفع الصور
CREATE POLICY "المشرفون يرفعون إثباتات"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'farm-task-proofs' AND
    (storage.foldername(name))[1] IN (
      SELECT farm_id::text FROM farm_team_members
      WHERE user_id = auth.uid() AND role = 'farm_supervisor' AND is_active = true
    )
  );

-- الجميع يرى الصور المعتمدة
CREATE POLICY "الجميع يرى الإثباتات المعتمدة"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'farm-task-proofs');

-- المدراء يحذفون صور مزارعهم
CREATE POLICY "المدراء يحذفون إثباتات مزارعهم"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'farm-task-proofs' AND
    (storage.foldername(name))[1] IN (
      SELECT farm_id::text FROM farm_team_members
      WHERE user_id = auth.uid() AND role = 'farm_manager' AND is_active = true
    )
  );

-- =====================================================
-- 5. دوال إضافية
-- =====================================================

-- دالة لبدء المهمة
CREATE OR REPLACE FUNCTION start_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks%ROWTYPE;
BEGIN
  -- التحقق من المهمة
  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  -- التحقق من الصلاحيات
  IF v_task.assigned_to_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;
  
  -- التحقق من الحالة
  IF v_task.status != 'new' THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة ليست جديدة');
  END IF;
  
  -- تحديث الحالة
  UPDATE farm_tasks SET
    status = 'in_progress',
    started_at = now(),
    updated_at = now()
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'تم بدء المهمة بنجاح');
END;
$$;

-- دالة لإرسال الإثبات
CREATE OR REPLACE FUNCTION submit_task_proof(
  p_task_id uuid,
  p_notes text,
  p_attachments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks%ROWTYPE;
  v_proof_id uuid;
  v_supervisor_name text;
BEGIN
  -- التحقق من المهمة
  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  -- التحقق من الصلاحيات
  IF v_task.assigned_to_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;
  
  -- الحصول على اسم المشرف
  SELECT full_name INTO v_supervisor_name
  FROM farm_team_members
  WHERE user_id = auth.uid() AND farm_id = v_task.farm_id
  LIMIT 1;
  
  -- إضافة الإثبات
  INSERT INTO task_proofs (
    task_id,
    farm_id,
    supervisor_id,
    supervisor_name,
    notes,
    attachments,
    execution_time
  ) VALUES (
    p_task_id,
    v_task.farm_id,
    auth.uid(),
    v_supervisor_name,
    p_notes,
    p_attachments,
    now()
  ) RETURNING id INTO v_proof_id;
  
  -- تحديث حالة المهمة
  UPDATE farm_tasks SET
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'proof_id', v_proof_id,
    'message', 'تم إرسال الإثبات للمدير'
  );
END;
$$;

-- دالة لاعتماد الإثبات
CREATE OR REPLACE FUNCTION approve_task_proof(
  p_task_id uuid,
  p_approval_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks%ROWTYPE;
BEGIN
  -- التحقق من المهمة
  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  -- التحقق من الصلاحيات
  IF NOT check_farm_role(auth.uid(), v_task.farm_id, 'farm_manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;
  
  -- تحديث الإثبات
  UPDATE task_proofs SET
    status = 'approved',
    reviewed_by = auth.uid(),
    review_notes = p_approval_notes,
    reviewed_at = now(),
    updated_at = now()
  WHERE task_id = p_task_id;
  
  -- تحديث المهمة
  UPDATE farm_tasks SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    approval_notes = p_approval_notes,
    updated_at = now()
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'تم اعتماد المهمة بنجاح');
END;
$$;

-- دالة لرفض الإثبات
CREATE OR REPLACE FUNCTION reject_task_proof(
  p_task_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks%ROWTYPE;
BEGIN
  -- التحقق من المهمة
  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;
  
  -- التحقق من الصلاحيات
  IF NOT check_farm_role(auth.uid(), v_task.farm_id, 'farm_manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;
  
  -- تحديث الإثبات
  UPDATE task_proofs SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    review_notes = p_rejection_reason,
    reviewed_at = now(),
    updated_at = now()
  WHERE task_id = p_task_id;
  
  -- تحديث المهمة (إرجاع للمشرف)
  UPDATE farm_tasks SET
    status = 'in_progress',
    rejected_by = auth.uid(),
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'تم إرجاع المهمة للمشرف');
END;
$$;

-- =====================================================
-- 6. دالة إحصائيات المهام
-- =====================================================

CREATE OR REPLACE FUNCTION get_farm_tasks_stats(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'new', COUNT(*) FILTER (WHERE status = 'new'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status IN ('new', 'in_progress'))
  )
  INTO v_stats
  FROM farm_tasks
  WHERE farm_id = p_farm_id;
  
  RETURN v_stats;
END;
$$;

CREATE OR REPLACE FUNCTION get_supervisor_tasks_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status IN ('new', 'in_progress')),
    'awaiting_approval', COUNT(*) FILTER (WHERE status = 'submitted'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected')
  )
  INTO v_stats
  FROM farm_tasks
  WHERE assigned_to_user_id = p_user_id;
  
  RETURN v_stats;
END;
$$;
