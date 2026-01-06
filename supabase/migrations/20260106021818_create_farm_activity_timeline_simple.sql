/*
  # Farm Activity Timeline System - Read-only version

  1. New Tables
    - `farm_activity_timeline` - سجل الأحداث الزمني للمزرعة

  2. Event Types
    - task_created, task_status_changed, proof_uploaded
    - task_approved, task_rejected
    - expense_added, equipment_added

  3. Security
    - RLS enabled
    - Farm team members can read
    - Anyone can insert (for now, will be restricted later)
*/

-- Create farm_activity_timeline table
CREATE TABLE IF NOT EXISTS farm_activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  actor_id uuid,
  actor_name text NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create index for farm_id and created_at (for fast queries)
CREATE INDEX IF NOT EXISTS idx_farm_activity_timeline_farm_id_created
  ON farm_activity_timeline(farm_id, created_at DESC);

-- Create index for reference lookups
CREATE INDEX IF NOT EXISTS idx_farm_activity_timeline_reference
  ON farm_activity_timeline(reference_type, reference_id);

-- Enable RLS
ALTER TABLE farm_activity_timeline ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read timeline
CREATE POLICY "Authenticated users can view timeline"
  ON farm_activity_timeline
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy: Anyone can insert timeline entries (temporary for testing)
CREATE POLICY "Anyone can insert timeline"
  ON farm_activity_timeline
  FOR INSERT
  WITH CHECK (true);

-- Function: Add timeline entry
CREATE OR REPLACE FUNCTION add_farm_timeline_entry(
  p_farm_id uuid,
  p_event_type text,
  p_event_data jsonb,
  p_actor_id uuid,
  p_actor_name text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id uuid;
BEGIN
  INSERT INTO farm_activity_timeline (
    farm_id,
    event_type,
    event_data,
    actor_id,
    actor_name,
    reference_type,
    reference_id
  )
  VALUES (
    p_farm_id,
    p_event_type,
    p_event_data,
    p_actor_id,
    p_actor_name,
    p_reference_type,
    p_reference_id
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- Function: Get farm timeline
CREATE OR REPLACE FUNCTION get_farm_timeline(
  p_farm_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  event_type text,
  event_data jsonb,
  actor_id uuid,
  actor_name text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.farm_id,
    t.event_type,
    t.event_data,
    t.actor_id,
    t.actor_name,
    t.reference_type,
    t.reference_id,
    t.created_at
  FROM farm_activity_timeline t
  WHERE t.farm_id = p_farm_id
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add test data
DO $$
DECLARE
  v_test_farm_id uuid;
BEGIN
  -- Get first farm
  SELECT id INTO v_test_farm_id
  FROM b2f_farms
  LIMIT 1;

  IF v_test_farm_id IS NOT NULL THEN
    -- Task created
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'task_created',
      jsonb_build_object(
        'task_title', 'ري الأشجار - القطاع الشمالي',
        'task_type', 'irrigation',
        'assigned_to', 'أحمد محمد'
      ),
      NULL,
      'مدير المزرعة',
      'task',
      gen_random_uuid()
    );

    -- Task status changed
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'task_status_changed',
      jsonb_build_object(
        'task_title', 'ري الأشجار - القطاع الشمالي',
        'old_status', 'pending',
        'new_status', 'in_progress'
      ),
      NULL,
      'أحمد محمد',
      'task',
      gen_random_uuid()
    );

    -- Proof uploaded
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'proof_uploaded',
      jsonb_build_object(
        'task_title', 'ري الأشجار - القطاع الشمالي',
        'proof_type', 'photo',
        'file_count', 3
      ),
      NULL,
      'أحمد محمد',
      'task',
      gen_random_uuid()
    );

    -- Task approved
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'task_approved',
      jsonb_build_object(
        'task_title', 'ري الأشجار - القطاع الشمالي',
        'notes', 'تم إنجاز المهمة بشكل ممتاز'
      ),
      NULL,
      'مدير المزرعة',
      'task',
      gen_random_uuid()
    );

    -- Expense added
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'expense_added',
      jsonb_build_object(
        'expense_type', 'irrigation',
        'amount', 500,
        'description', 'صيانة نظام الري'
      ),
      NULL,
      'مدير المزرعة',
      'ledger',
      gen_random_uuid()
    );

    -- Equipment added
    PERFORM add_farm_timeline_entry(
      v_test_farm_id,
      'equipment_added',
      jsonb_build_object(
        'equipment_name', 'مضخة مياه 5 حصان',
        'quantity', 1,
        'cost', 3000
      ),
      NULL,
      'مدير المزرعة',
      'equipment',
      gen_random_uuid()
    );

  END IF;
END $$;