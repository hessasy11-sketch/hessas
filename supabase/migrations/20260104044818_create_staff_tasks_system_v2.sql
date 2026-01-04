/*
  # نظام المهام الذكي للموظفين - الإصدار 2
  
  1. جداول جديدة:
    - `staff_tasks`: جدول المهام المعينة للموظفين
  
  2. الميزات:
    - تتبع المهام وحالتها
    - نظام النقاط والمكافآت
    - إحصائيات الأداء
    - التعيين التلقائي
  
  3. الأمان:
    - RLS مفعل بالكامل
*/

-- Create staff_tasks table
CREATE TABLE IF NOT EXISTS staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  board text NOT NULL,
  section text,
  requires_proof boolean DEFAULT false,
  proof_images text[],
  proof_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  estimated_duration_minutes int DEFAULT 0,
  actual_duration_minutes int,
  points_earned int DEFAULT 0,
  assigned_by uuid REFERENCES platform_staff(id),
  approved_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view own tasks"
  ON staff_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = staff_tasks.staff_id
      AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage tasks"
  ON staff_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Managers can view all tasks"
  ON staff_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers can create tasks"
  ON staff_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Staff can update own tasks status"
  ON staff_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = staff_tasks.staff_id
      AND ps.user_id = auth.uid()
    )
  );

-- Function to calculate task points
CREATE OR REPLACE FUNCTION calculate_task_points(task_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_points int := 10;
  priority_multiplier numeric := 1;
  speed_bonus int := 0;
  task_priority text;
  estimated_duration int;
  actual_duration int;
BEGIN
  SELECT priority, estimated_duration_minutes, actual_duration_minutes
  INTO task_priority, estimated_duration, actual_duration
  FROM staff_tasks
  WHERE id = task_id;
  
  CASE task_priority
    WHEN 'urgent' THEN priority_multiplier := 2;
    WHEN 'high' THEN priority_multiplier := 1.5;
    WHEN 'medium' THEN priority_multiplier := 1;
    WHEN 'low' THEN priority_multiplier := 0.8;
  END CASE;
  
  IF actual_duration IS NOT NULL AND estimated_duration > 0 THEN
    IF actual_duration < estimated_duration THEN
      speed_bonus := ROUND((estimated_duration - actual_duration) * 0.5);
    END IF;
  END IF;
  
  RETURN ROUND(base_points * priority_multiplier) + speed_bonus;
END;
$$;

-- Function to get staff task stats
CREATE OR REPLACE FUNCTION get_staff_task_stats()
RETURNS TABLE (
  staff_id uuid,
  full_name text,
  staff_code text,
  total_tasks bigint,
  completed_tasks bigint,
  pending_tasks bigint,
  in_progress_tasks bigint,
  avg_completion_time numeric,
  points int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.full_name,
    ps.staff_code,
    COUNT(st.id) as total_tasks,
    COUNT(st.id) FILTER (WHERE st.status = 'completed') as completed_tasks,
    COUNT(st.id) FILTER (WHERE st.status = 'pending') as pending_tasks,
    COUNT(st.id) FILTER (WHERE st.status = 'in_progress') as in_progress_tasks,
    COALESCE(AVG(st.actual_duration_minutes), 0) as avg_completion_time,
    COALESCE(SUM(st.points_earned), 0)::int as points
  FROM platform_staff ps
  LEFT JOIN staff_tasks st ON st.staff_id = ps.id
  WHERE ps.is_active = true
  GROUP BY ps.id, ps.full_name, ps.staff_code
  ORDER BY points DESC, completed_tasks DESC;
END;
$$;

-- Trigger to update task points when completed
CREATE OR REPLACE FUNCTION update_task_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := now();
    IF NEW.started_at IS NOT NULL THEN
      NEW.actual_duration_minutes := EXTRACT(EPOCH FROM (now() - NEW.started_at)) / 60;
    END IF;
    NEW.points_earned := calculate_task_points(NEW.id);
  END IF;
  
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    NEW.started_at := now();
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_task_points ON staff_tasks;
CREATE TRIGGER trigger_update_task_points
  BEFORE UPDATE ON staff_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_points();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff_id ON staff_tasks(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_board ON staff_tasks(board);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON staff_tasks(created_at DESC);
