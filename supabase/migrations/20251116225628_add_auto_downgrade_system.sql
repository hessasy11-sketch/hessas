/*
  # نظام الهبوط التلقائي للمجانية

  1. New Tables
    - `subscription_downgrade_logs` - سجل التحويلات التلقائية
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `old_subscription_id` (uuid)
      - `old_plan_name` (text)
      - `new_plan_id` (uuid, references subscription_plans)
      - `downgrade_reason` (text)
      - `downgrade_date` (timestamptz)
      - `ai_notification_sent` (boolean)
      - `created_at` (timestamptz)
  
  2. Changes to user_subscriptions
    - إضافة حقل `downgraded_at` - وقت التحويل للمجانية
    - إضافة حقل `auto_downgraded` - تم التحويل تلقائياً
  
  3. Security
    - Enable RLS on `subscription_downgrade_logs` table
    - Add policies for users to read their own logs
    - Add policies for admin to read all logs
*/

-- إضافة حقل وقت التحويل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'downgraded_at'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN downgraded_at timestamptz;
  END IF;
END $$;

-- إضافة حقل التحويل التلقائي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'auto_downgraded'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN auto_downgraded boolean DEFAULT false;
  END IF;
END $$;

-- إنشاء جدول سجل التحويلات
CREATE TABLE IF NOT EXISTS subscription_downgrade_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  old_subscription_id uuid NOT NULL,
  old_plan_name text NOT NULL,
  old_plan_price numeric NOT NULL,
  new_plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  new_plan_name text NOT NULL,
  downgrade_reason text DEFAULT 'subscription_expired',
  downgrade_date timestamptz DEFAULT now(),
  ai_notification_sent boolean DEFAULT false,
  features_disabled jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_downgrade_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own downgrade logs
CREATE POLICY "Users can view own downgrade logs"
  ON subscription_downgrade_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all downgrade logs
CREATE POLICY "Admin can view all downgrade logs"
  ON subscription_downgrade_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Admin can insert downgrade logs
CREATE POLICY "Admin can insert downgrade logs"
  ON subscription_downgrade_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Service role can insert (for Edge Functions)
CREATE POLICY "Service role can manage downgrade logs"
  ON subscription_downgrade_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
