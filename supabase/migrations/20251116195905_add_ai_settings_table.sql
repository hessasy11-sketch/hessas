/*
  # Add AI Settings Table
  
  1. New Tables
    - `ai_settings`
      - `id` (uuid, primary key)
      - `ai_enabled` (boolean) - تفعيل/تعطيل الذكاء الصناعي
      - `auto_upgrade` (boolean) - الترقية التلقائية
      - `auto_notifications` (boolean) - التنبيهات التلقائية
      - `auto_downgrade` (boolean) - التنزيل التلقائي عند انتهاء الباقة
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - المدير الذي قام بالتحديث
      
  2. Security
    - Enable RLS on `ai_settings` table
    - Add policy for admins to read settings
    - Add policy for admins to update settings
*/

CREATE TABLE IF NOT EXISTS ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled boolean DEFAULT true,
  auto_upgrade boolean DEFAULT true,
  auto_notifications boolean DEFAULT true,
  auto_downgrade boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- إدراج السجل الافتراضي
INSERT INTO ai_settings (ai_enabled, auto_upgrade, auto_notifications, auto_downgrade)
VALUES (true, true, true, true)
ON CONFLICT DO NOTHING;

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI settings"
  ON ai_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update AI settings"
  ON ai_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
