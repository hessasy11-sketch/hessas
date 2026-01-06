/*
  # نظام توليد مهام التأسيس التلقائية - المرحلة 2
  
  ## الهدف
  عند ولادة المزرعة (حدث FARM_BORN)، ينشئ النظام تلقائياً
  حزمة مهام تأسيس للمزرعة الجديدة
  
  ## المهام التلقائية
  1. تعيين مدير المزرعة
  2. إضافة محتويات المزرعة (أشجار/محاصيل)
  3. إدخال المعدات الأساسية
  4. مراجعة بيانات المزرعة
  5. إعداد نظام الري
  6. إنشاء خطة تشغيل 30 يوم
  
  ## التدفق
  farm_birth_events → generate_setup_tasks() → farm_tasks (6 مهام)
*/

-- =====================================================
-- 1. جدول قوالب مهام التأسيس
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_setup_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  task_type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'high',
  order_index integer NOT NULL,
  due_days_offset integer DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- الفهرس
CREATE INDEX IF NOT EXISTS idx_setup_task_templates_order 
  ON farm_setup_task_templates(order_index, is_active);

-- =====================================================
-- 2. إدراج قوالب المهام الافتراضية
-- =====================================================
INSERT INTO farm_setup_task_templates (title, description, task_type, priority, order_index, due_days_offset)
VALUES
  (
    'تعيين مدير المزرعة',
    'تحديد وتعيين مدير مزرعة مسؤول عن متابعة جميع العمليات التشغيلية. يجب أن يكون لديه خبرة في إدارة المزارع ومتابعة الفريق.',
    'general',
    'urgent',
    1,
    3
  ),
  (
    'إضافة محتويات المزرعة',
    'تسجيل جميع الأشجار والمحاصيل الموجودة في المزرعة مع تحديد الأنواع والأعداد والمواقع. يشمل: النخيل، الزيتون، الحمضيات، وغيرها.',
    'general',
    'high',
    2,
    5
  ),
  (
    'إدخال المعدات والأدوات',
    'تسجيل جميع المعدات الزراعية والأدوات المتوفرة في المزرعة مع حالتها وتواريخ الصيانة. مثل: معدات الري، الجرارات، الأدوات اليدوية.',
    'maintenance',
    'high',
    3,
    5
  ),
  (
    'مراجعة بيانات المزرعة',
    'التحقق من صحة واكتمال جميع بيانات المزرعة: الموقع، المساحة، نوع التربة، مصادر المياه، الحدود، وسندات الملكية.',
    'inspection',
    'high',
    4,
    7
  ),
  (
    'إعداد نظام الري',
    'فحص وإعداد نظام الري الحالي أو التخطيط لتركيب نظام جديد. تحديد مصادر المياه، جداول الري، والاحتياجات المائية.',
    'irrigation',
    'high',
    5,
    10
  ),
  (
    'إنشاء خطة تشغيل 30 يوم',
    'وضع خطة تشغيلية تفصيلية للشهر الأول تشمل: جداول الري، برامج التسميد، عمليات الصيانة، وتوزيع المهام على الفريق.',
    'general',
    'high',
    6,
    15
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. Function: توليد مهام التأسيس
-- =====================================================
CREATE OR REPLACE FUNCTION generate_farm_setup_tasks(
  p_farm_id uuid,
  p_birth_event_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_count integer := 0;
  v_template RECORD;
  v_new_task_id uuid;
BEGIN
  -- التحقق من وجود المزرعة
  IF NOT EXISTS (SELECT 1 FROM b2f_farms WHERE id = p_farm_id) THEN
    RAISE EXCEPTION 'المزرعة غير موجودة: %', p_farm_id;
  END IF;
  
  -- التحقق من عدم توليد المهام مسبقاً لنفس الحدث
  IF EXISTS (
    SELECT 1 FROM farm_tasks 
    WHERE farm_id = p_farm_id 
      AND description LIKE '%[AUTO-SETUP]%'
      AND created_at > now() - INTERVAL '1 hour'
  ) THEN
    -- المهام موجودة بالفعل
    RETURN 0;
  END IF;
  
  -- توليد مهام من القوالب
  FOR v_template IN
    SELECT * FROM farm_setup_task_templates
    WHERE is_active = true
    ORDER BY order_index
  LOOP
    -- إنشاء مهمة جديدة من القالب
    INSERT INTO farm_tasks (
      farm_id,
      title,
      description,
      type,
      priority,
      status,
      due_date,
      created_by_name,
      created_at
    )
    VALUES (
      p_farm_id,
      v_template.title,
      v_template.description || E'\n\n[AUTO-SETUP] مهمة تم إنشاؤها تلقائياً عند ولادة المزرعة.',
      v_template.task_type,
      v_template.priority,
      'pending',
      now() + (v_template.due_days_offset || ' days')::interval,
      'النظام الآلي',
      now()
    )
    RETURNING id INTO v_new_task_id;
    
    v_task_count := v_task_count + 1;
    
    RAISE NOTICE 'تم إنشاء مهمة %: % (ID: %)', 
      v_task_count, v_template.title, v_new_task_id;
  END LOOP;
  
  RETURN v_task_count;
END;
$$;

-- =====================================================
-- 4. Trigger: توليد المهام عند ولادة المزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_setup_tasks_on_farm_birth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks_created integer;
BEGIN
  -- عند إنشاء حدث ولادة مزرعة جديد
  IF (TG_OP = 'INSERT' AND NEW.event_type = 'FARM_BORN') THEN
    
    -- توليد مهام التأسيس
    v_tasks_created := generate_farm_setup_tasks(
      NEW.farm_id,
      NEW.id
    );
    
    -- تحديث metadata في حدث الولادة
    UPDATE farm_birth_events
    SET metadata = metadata || jsonb_build_object(
      'setup_tasks_generated', true,
      'setup_tasks_count', v_tasks_created,
      'setup_tasks_generated_at', now()
    )
    WHERE id = NEW.id;
    
    RAISE NOTICE '✅ تم توليد % مهام تأسيس للمزرعة %', 
      v_tasks_created, NEW.farm_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إزالة trigger قديم إن وجد
DROP TRIGGER IF EXISTS trigger_setup_tasks_on_farm_birth ON farm_birth_events;

-- إنشاء trigger جديد
CREATE TRIGGER trigger_setup_tasks_on_farm_birth
  AFTER INSERT ON farm_birth_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_setup_tasks_on_farm_birth();

-- =====================================================
-- 5. RLS Policies لجدول القوالب
-- =====================================================
ALTER TABLE farm_setup_task_templates ENABLE ROW LEVEL SECURITY;

-- الجميع يمكنهم القراءة
CREATE POLICY "Anyone can view setup task templates"
  ON farm_setup_task_templates
  FOR SELECT
  USING (true);

-- فقط الإدارة يمكنهم التعديل
CREATE POLICY "Admin can modify setup task templates"
  ON farm_setup_task_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. دالة مساعدة: جلب مهام التأسيس لمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_setup_tasks(
  p_farm_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  priority text,
  status text,
  due_date timestamptz,
  created_at timestamptz,
  is_auto_generated boolean,
  days_until_due integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.title,
    ft.description,
    ft.type,
    ft.priority,
    ft.status,
    ft.due_date,
    ft.created_at,
    (ft.description LIKE '%[AUTO-SETUP]%') as is_auto_generated,
    CASE
      WHEN ft.due_date IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (ft.due_date - now()))::integer
    END as days_until_due
  FROM farm_tasks ft
  WHERE ft.farm_id = p_farm_id
    AND ft.description LIKE '%[AUTO-SETUP]%'
  ORDER BY 
    CASE ft.status
      WHEN 'pending' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'submitted' THEN 3
      WHEN 'approved' THEN 4
      WHEN 'rejected' THEN 5
      WHEN 'cancelled' THEN 6
    END,
    ft.due_date NULLS LAST,
    ft.created_at DESC;
END;
$$;

-- =====================================================
-- 7. دالة مساعدة: إحصائيات مهام التأسيس
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_setup_tasks_stats(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'overdue', COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < now()),
    'completion_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*)::numeric) * 100, 1)
        ELSE 0
      END
  )
  INTO v_stats
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND description LIKE '%[AUTO-SETUP]%';
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- 8. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION generate_farm_setup_tasks(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_farm_setup_tasks(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_setup_tasks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_setup_tasks(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_setup_tasks_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_setup_tasks_stats(uuid) TO anon;

-- =====================================================
-- تعليقات توضيحية
-- =====================================================
COMMENT ON TABLE farm_setup_task_templates IS 'قوالب مهام التأسيس التلقائية للمزارع الجديدة';
COMMENT ON FUNCTION generate_farm_setup_tasks IS 'توليد مهام تأسيس تلقائية عند ولادة المزرعة';
COMMENT ON FUNCTION trigger_generate_setup_tasks_on_farm_birth IS 'Trigger تلقائي لتوليد مهام التأسيس';
COMMENT ON FUNCTION get_farm_setup_tasks IS 'جلب مهام التأسيس لمزرعة معينة';
COMMENT ON FUNCTION get_farm_setup_tasks_stats IS 'إحصائيات مهام التأسيس لمزرعة';
