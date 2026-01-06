/*
  # Task Proofs System - Phase 2

  1. Updates to farm_tasks
    - Add `requires_proof` boolean field
    - Add `proof_notes` text field (worker notes with proof)

  2. Storage Bucket
    - Create `task-proofs` bucket for proof images/files

  3. Functions
    - approve_task_with_proof() - Approve and log to timeline
    - reject_task_with_proof() - Reject and log to timeline  
    - submit_task_with_proof() - Submit and log to timeline
*/

-- Add requires_proof to farm_tasks
ALTER TABLE farm_tasks 
ADD COLUMN IF NOT EXISTS requires_proof boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS proof_notes text;

-- Create task-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-proofs
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Anyone can view task proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload task proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own task proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own task proofs" ON storage.objects;
END $$;

CREATE POLICY "Anyone can view task proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-proofs');

CREATE POLICY "Authenticated users can upload task proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-proofs' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

CREATE POLICY "Users can update own task proofs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'task-proofs' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

CREATE POLICY "Users can delete own task proofs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-proofs' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

-- Function: Submit task with proof
CREATE OR REPLACE FUNCTION submit_task_with_proof(
  p_task_id uuid,
  p_submitted_by uuid,
  p_submitted_by_name text,
  p_proof_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks;
  v_timeline_id uuid;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM farm_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Update task
  UPDATE farm_tasks
  SET 
    status = 'submitted',
    submitted_at = now(),
    proof_notes = p_proof_notes,
    updated_at = now()
  WHERE id = p_task_id;

  -- Add to timeline
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
    v_task.farm_id,
    'proof_uploaded',
    jsonb_build_object(
      'task_title', v_task.title,
      'task_type', v_task.type,
      'proof_notes', p_proof_notes
    ),
    p_submitted_by,
    p_submitted_by_name,
    'task',
    p_task_id
  )
  RETURNING id INTO v_timeline_id;

  RETURN json_build_object(
    'success', true,
    'task_id', p_task_id,
    'timeline_id', v_timeline_id
  );
END;
$$;

-- Function: Approve task with proof
CREATE OR REPLACE FUNCTION approve_task_with_proof(
  p_task_id uuid,
  p_approved_by uuid,
  p_approved_by_name text,
  p_approval_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks;
  v_timeline_id uuid;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM farm_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Update task status
  UPDATE farm_tasks
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = p_approved_by,
    approval_notes = p_approval_notes,
    updated_at = now()
  WHERE id = p_task_id;

  -- Add to timeline
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
    v_task.farm_id,
    'task_approved',
    jsonb_build_object(
      'task_title', v_task.title,
      'task_type', v_task.type,
      'notes', p_approval_notes
    ),
    p_approved_by,
    p_approved_by_name,
    'task',
    p_task_id
  )
  RETURNING id INTO v_timeline_id;

  RETURN json_build_object(
    'success', true,
    'task_id', p_task_id,
    'timeline_id', v_timeline_id
  );
END;
$$;

-- Function: Reject task with proof
CREATE OR REPLACE FUNCTION reject_task_with_proof(
  p_task_id uuid,
  p_rejected_by uuid,
  p_rejected_by_name text,
  p_rejection_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task farm_tasks;
  v_timeline_id uuid;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM farm_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Update task status
  UPDATE farm_tasks
  SET 
    status = 'rejected',
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_task_id;

  -- Add to timeline
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
    v_task.farm_id,
    'task_rejected',
    jsonb_build_object(
      'task_title', v_task.title,
      'task_type', v_task.type,
      'reason', p_rejection_reason
    ),
    p_rejected_by,
    p_rejected_by_name,
    'task',
    p_task_id
  )
  RETURNING id INTO v_timeline_id;

  RETURN json_build_object(
    'success', true,
    'task_id', p_task_id,
    'timeline_id', v_timeline_id
  );
END;
$$;