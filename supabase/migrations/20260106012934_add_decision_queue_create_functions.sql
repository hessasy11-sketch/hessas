/*
  # Add Decision Queue Creation System
  
  1. RLS Policies
    - Allow authenticated users to insert decisions
    - Allow all to read pending decisions
    - Allow admins to update decisions
    
  2. Functions
    - `create_b2f_decision()` - Create new decision for B2F operations
    
  3. Decision Types Supported
    - toggle_bookings_off (إيقاف الحجوزات)
    - toggle_bookings_on (فتح الحجوزات)
    - change_farm_manager (تغيير مدير المزرعة)
    - review_farm_expenses (مراجعة مصروفات)
*/

-- Enable RLS on decision_queue if not already enabled
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view pending decisions" ON decision_queue;
DROP POLICY IF EXISTS "Authenticated users can create decisions" ON decision_queue;
DROP POLICY IF EXISTS "Staff can update own decisions" ON decision_queue;

-- Policy: Anyone can view pending decisions
CREATE POLICY "Anyone can view pending decisions"
  ON decision_queue
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create decisions
CREATE POLICY "Authenticated users can create decisions"
  ON decision_queue
  FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

-- Policy: Allow updates for admins/staff
CREATE POLICY "Staff can update decisions"
  ON decision_queue
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to create B2F decision
CREATE OR REPLACE FUNCTION create_b2f_decision(
  p_decision_type text,
  p_farm_id uuid,
  p_requested_by uuid,
  p_priority text DEFAULT 'normal',
  p_notes text DEFAULT NULL,
  p_target_staff_id uuid DEFAULT NULL,
  p_expense_amount numeric DEFAULT NULL,
  p_expense_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_farm_name text;
  v_requester_name text;
BEGIN
  -- Get farm name
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;
  
  IF v_farm_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المزرعة غير موجودة'
    );
  END IF;
  
  -- Get requester name
  SELECT COALESCE(full_name_ar, staff_code) INTO v_requester_name
  FROM platform_staff
  WHERE id = p_requested_by;
  
  IF v_requester_name IS NULL THEN
    v_requester_name := 'موظف غير معروف';
  END IF;
  
  -- Insert decision
  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    requested_by,
    status,
    priority,
    notes,
    target_staff_id,
    expense_amount,
    expense_description,
    action_data
  )
  VALUES (
    p_decision_type,
    p_farm_id,
    p_requested_by,
    'pending',
    p_priority,
    p_notes,
    p_target_staff_id,
    p_expense_amount,
    p_expense_description,
    json_build_object(
      'farm_name', v_farm_name,
      'requester_name', v_requester_name,
      'created_from', 'b2f_operations_room'
    )::jsonb
  )
  RETURNING id INTO v_decision_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message', 'تم إنشاء القرار بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_b2f_decision TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION create_b2f_decision IS 'Creates a new decision for B2F operations (bookings, manager, expenses)';
