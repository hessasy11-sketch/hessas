/*
  # ميزات متقدمة لنظام المهام
  
  1. جداول جديدة:
    - `staff_achievements`: نظام الإنجازات والأوسمة
    - `task_analytics`: تحليلات الأداء
    - `auto_task_rules`: قواعد توليد المهام التلقائي
  
  2. الميزات:
    - نظام الإنجازات (Gamification)
    - تحليلات ذكية
    - توليد مهام عند QR
    - تنبيهات استباقية
*/

-- جدول الإنجازات والأوسمة
CREATE TABLE IF NOT EXISTS staff_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  achievement_type text NOT NULL CHECK (achievement_type IN (
    'speed_master',      -- إنجاز سريع
    'perfectionist',     -- دقة عالية
    'multitasker',       -- متعدد المهام
    'early_bird',        -- الطائر المبكر
    'night_owl',         -- بومة الليل
    'team_player',       -- لاعب جماعي
    'task_crusher',      -- محطم المهام
    'week_warrior',      -- محارب الأسبوع
    'month_champion',    -- بطل الشهر
    'year_legend'        -- أسطورة السنة
  )),
  level int DEFAULT 1,
  points_required int DEFAULT 100,
  current_progress int DEFAULT 0,
  unlocked_at timestamptz,
  badge_icon text,
  badge_color text,
  reward_bonus int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول التحليلات والإحصائيات المتقدمة
CREATE TABLE IF NOT EXISTS task_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_assigned int DEFAULT 0,
  tasks_started int DEFAULT 0,
  tasks_completed int DEFAULT 0,
  tasks_cancelled int DEFAULT 0,
  avg_completion_time_minutes numeric DEFAULT 0,
  total_points_earned int DEFAULT 0,
  efficiency_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  speed_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- جدول قواعد توليد المهام التلقائي
CREATE TABLE IF NOT EXISTS auto_task_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'qr_scan',           -- عند مسح QR
    'time_based',        -- حسب الوقت
    'event_based',       -- حسب حدث معين
    'workload_based'     -- حسب حمل العمل
  )),
  trigger_conditions jsonb,
  template_id uuid REFERENCES task_templates(id),
  target_board text,
  target_department text,
  priority text DEFAULT 'medium',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول سجل المهام المولدة تلقائياً
CREATE TABLE IF NOT EXISTS auto_generated_tasks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES staff_tasks(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES auto_task_rules(id),
  staff_id uuid REFERENCES platform_staff(id),
  trigger_event text,
  trigger_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_task_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_generated_tasks_log ENABLE ROW LEVEL SECURITY;

-- Policies for staff_achievements
CREATE POLICY "Staff can view own achievements"
  ON staff_achievements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.id = staff_achievements.staff_id
    AND ps.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage achievements"
  ON staff_achievements FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Policies for task_analytics
CREATE POLICY "Staff can view own analytics"
  ON task_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.id = task_analytics.staff_id
    AND ps.user_id = auth.uid()
  ));

CREATE POLICY "Managers can view all analytics"
  ON task_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('manager', 'admin')
  ));

CREATE POLICY "Service role can manage analytics"
  ON task_analytics FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Policies for auto_task_rules
CREATE POLICY "Managers can view rules"
  ON auto_task_rules FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('manager', 'admin')
  ));

CREATE POLICY "Service role can manage rules"
  ON auto_task_rules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Function: حساب درجة الكفاءة
CREATE OR REPLACE FUNCTION calculate_efficiency_score(p_staff_id uuid, p_date date)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_completed int;
  v_assigned int;
  v_avg_time numeric;
  v_expected_time numeric;
  v_score numeric := 0;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*),
    AVG(actual_duration_minutes),
    AVG(st.estimated_duration_minutes)
  INTO v_completed, v_assigned, v_avg_time, v_expected_time
  FROM staff_tasks st
  LEFT JOIN task_templates tt ON tt.id = st.template_id
  WHERE st.staff_id = p_staff_id
  AND DATE(st.created_at) = p_date;
  
  IF v_assigned > 0 THEN
    v_score := (v_completed::numeric / v_assigned) * 100;
    
    IF v_avg_time IS NOT NULL AND v_expected_time > 0 THEN
      IF v_avg_time <= v_expected_time THEN
        v_score := v_score * 1.2;
      END IF;
    END IF;
  END IF;
  
  RETURN LEAST(v_score, 100);
END;
$$;

-- Function: تحديث التحليلات اليومية
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO task_analytics (
    staff_id,
    date,
    tasks_assigned,
    tasks_started,
    tasks_completed,
    tasks_cancelled,
    avg_completion_time_minutes,
    total_points_earned,
    efficiency_score
  )
  SELECT 
    st.staff_id,
    CURRENT_DATE,
    COUNT(*) as tasks_assigned,
    COUNT(*) FILTER (WHERE st.status IN ('in_progress', 'completed')) as tasks_started,
    COUNT(*) FILTER (WHERE st.status = 'completed') as tasks_completed,
    COUNT(*) FILTER (WHERE st.status = 'cancelled') as tasks_cancelled,
    AVG(st.actual_duration_minutes) as avg_completion_time_minutes,
    SUM(st.points_earned) as total_points_earned,
    calculate_efficiency_score(st.staff_id, CURRENT_DATE) as efficiency_score
  FROM staff_tasks st
  WHERE DATE(st.created_at) = CURRENT_DATE
  GROUP BY st.staff_id
  ON CONFLICT (staff_id, date) 
  DO UPDATE SET
    tasks_assigned = EXCLUDED.tasks_assigned,
    tasks_started = EXCLUDED.tasks_started,
    tasks_completed = EXCLUDED.tasks_completed,
    tasks_cancelled = EXCLUDED.tasks_cancelled,
    avg_completion_time_minutes = EXCLUDED.avg_completion_time_minutes,
    total_points_earned = EXCLUDED.total_points_earned,
    efficiency_score = EXCLUDED.efficiency_score,
    updated_at = now();
END;
$$;

-- Function: فتح إنجاز جديد
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_staff_id uuid,
  p_achievement_type text,
  p_level int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_points_required int;
  v_reward_bonus int;
BEGIN
  v_points_required := p_level * 100;
  v_reward_bonus := p_level * 50;
  
  INSERT INTO staff_achievements (
    staff_id,
    achievement_type,
    level,
    points_required,
    current_progress,
    unlocked_at,
    reward_bonus
  )
  VALUES (
    p_staff_id,
    p_achievement_type,
    p_level,
    v_points_required,
    v_points_required,
    now(),
    v_reward_bonus
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function: توليد مهمة تلقائياً عند مسح QR
CREATE OR REPLACE FUNCTION auto_generate_task_on_qr_scan(
  p_staff_id uuid,
  p_qr_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
  v_rule_id uuid;
  v_template_id uuid;
  v_staff_department text;
  v_current_hour int;
BEGIN
  -- الحصول على قسم الموظف
  SELECT department INTO v_staff_department
  FROM platform_staff
  WHERE id = p_staff_id;
  
  v_current_hour := EXTRACT(HOUR FROM CURRENT_TIME);
  
  -- البحث عن قاعدة مناسبة
  SELECT id, template_id INTO v_rule_id, v_template_id
  FROM auto_task_rules
  WHERE is_active = true
  AND trigger_type = 'qr_scan'
  AND (target_department IS NULL OR target_department = v_staff_department)
  LIMIT 1;
  
  -- إذا لم يتم العثور على قاعدة، استخدام قالب افتراضي حسب الوقت
  IF v_template_id IS NULL THEN
    IF v_current_hour BETWEEN 6 AND 12 THEN
      -- مهام الصباح
      SELECT id INTO v_template_id
      FROM task_templates
      WHERE board = v_staff_department
      AND name ILIKE '%صباح%'
      LIMIT 1;
    ELSIF v_current_hour BETWEEN 12 AND 18 THEN
      -- مهام بعد الظهر
      SELECT id INTO v_template_id
      FROM task_templates
      WHERE board = v_staff_department
      LIMIT 1;
    END IF;
  END IF;
  
  -- إنشاء المهمة إذا تم العثور على قالب
  IF v_template_id IS NOT NULL THEN
    INSERT INTO staff_tasks (
      staff_id,
      template_id,
      title,
      description,
      status,
      priority,
      board
    )
    SELECT 
      p_staff_id,
      id,
      name || ' - ' || TO_CHAR(now(), 'DD/MM/YYYY'),
      description,
      'pending',
      priority,
      board
    FROM task_templates
    WHERE id = v_template_id
    RETURNING id INTO v_task_id;
    
    -- تسجيل المهمة المولدة
    IF v_rule_id IS NOT NULL THEN
      INSERT INTO auto_generated_tasks_log (
        task_id,
        rule_id,
        staff_id,
        trigger_event
      ) VALUES (
        v_task_id,
        v_rule_id,
        p_staff_id,
        'qr_scan: ' || p_qr_code
      );
    END IF;
  END IF;
  
  RETURN v_task_id;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_achievements_staff_id ON staff_achievements(staff_id);
CREATE INDEX IF NOT EXISTS idx_task_analytics_staff_date ON task_analytics(staff_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_auto_task_rules_trigger ON auto_task_rules(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_auto_generated_tasks_log_staff ON auto_generated_tasks_log(staff_id, trigger_time DESC);

-- إضافة قواعد توليد تلقائي افتراضية
INSERT INTO auto_task_rules (name, description, trigger_type, trigger_conditions, target_board, priority, is_active)
VALUES 
  ('مهمة الصباح التلقائية', 'توليد مهمة فحص يومي عند أول دخول', 'qr_scan', '{"time_range": "06:00-09:00"}', 'general', 'high', true),
  ('مهمة منتصف اليوم', 'مراجعة المهام المعلقة', 'time_based', '{"time": "12:00"}', 'general', 'medium', true),
  ('مهمة نهاية اليوم', 'إغلاق المهام وتسليم التقارير', 'time_based', '{"time": "17:00"}', 'general', 'high', true)
ON CONFLICT DO NOTHING;

-- إضافة الإنجازات الافتراضية
DO $$
DECLARE
  v_staff_record RECORD;
BEGIN
  FOR v_staff_record IN SELECT id FROM platform_staff WHERE is_active = true LOOP
    PERFORM unlock_achievement(v_staff_record.id, 'task_crusher', 1);
  END LOOP;
END $$;
