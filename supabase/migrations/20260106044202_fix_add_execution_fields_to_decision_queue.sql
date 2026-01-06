/*
  # إضافة حقول التنفيذ لجدول decision_queue
  
  حقول جديدة:
  - executed: هل تم التنفيذ
  - executed_at: متى تم التنفيذ
  - execution_result: نتيجة التنفيذ (jsonb)
*/

-- إضافة الحقول إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_queue' AND column_name = 'executed'
  ) THEN
    ALTER TABLE decision_queue ADD COLUMN executed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_queue' AND column_name = 'executed_at'
  ) THEN
    ALTER TABLE decision_queue ADD COLUMN executed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_queue' AND column_name = 'execution_result'
  ) THEN
    ALTER TABLE decision_queue ADD COLUMN execution_result jsonb;
  END IF;
END $$;

-- حذف وإعادة إنشاء الدالة
DROP FUNCTION IF EXISTS get_pending_b2f_decisions();

CREATE OR REPLACE FUNCTION get_pending_b2f_decisions()
RETURNS TABLE (
  id uuid,
  decision_type text,
  farm_id uuid,
  farm_name text,
  priority text,
  decision_data jsonb,
  requested_by uuid,
  requester_name text,
  created_at timestamptz,
  status text,
  executed boolean,
  executed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.id,
    dq.decision_type,
    dq.farm_id,
    bf.name as farm_name,
    dq.priority,
    dq.decision_data,
    dq.requested_by,
    ps.full_name as requester_name,
    dq.created_at,
    dq.status,
    COALESCE(dq.executed, false) as executed,
    dq.executed_at
  FROM decision_queue dq
  LEFT JOIN b2f_farms bf ON dq.farm_id = bf.id
  LEFT JOIN platform_staff ps ON dq.requested_by = ps.id
  WHERE dq.status = 'pending'
  ORDER BY 
    CASE dq.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    dq.created_at ASC;
END;
$$;
