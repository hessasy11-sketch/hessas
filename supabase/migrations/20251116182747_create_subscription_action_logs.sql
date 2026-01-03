/*
  # Create Subscription Action Logs Table
  
  1. New Tables
    - `subscription_action_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `admin_id` (uuid, foreign key to profiles)
      - `action_type` (text) - upgrade/downgrade/extend/pause
      - `action_data` (jsonb) - additional data
      - `notes` (text) - admin notes
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `subscription_action_logs` table
    - Add policy for admins to insert logs
    - Add policy for admins to view logs
*/

CREATE TABLE IF NOT EXISTS subscription_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert action logs"
  ON subscription_action_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view action logs"
  ON subscription_action_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON subscription_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_admin_id ON subscription_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON subscription_action_logs(created_at DESC);
