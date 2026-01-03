/*
  # إضافة نظام التحكم في الذكاء الصناعي

  1. جدول إعدادات AI
    - `id` (uuid, primary key)
    - `is_enabled` (boolean) - حالة تشغيل/تعطيل AI
    - `auto_receipt_reading` (boolean) - قراءة الإيصالات تلقائياً
    - `auto_activation` (boolean) - تفعيل الباقات تلقائياً
    - `auto_expiry_notifications` (boolean) - إرسال تنبيهات تلقائية
    - `auto_promotional_offers` (boolean) - تشغيل العروض الترويجية
    - `auto_trial_monitoring` (boolean) - مراقبة التجربة المجانية
    - `auto_plan_suggestions` (boolean) - اقتراح الباقات
    - `auto_upgrade_suggestions` (boolean) - اقتراح الترقيات
    - `error_tolerance` (float) - نسبة التسامح مع الأخطاء (0-1)
    - `autonomy_level` (float) - مستوى الاستقلالية (0-1)
    - `updated_at` (timestamptz)
    - `updated_by` (uuid) - من قام بالتحديث

  2. جدول سجل AI
    - `id` (uuid, primary key)
    - `action_type` (text) - نوع العملية
    - `action_data` (jsonb) - بيانات العملية
    - `status` (text) - success/error/warning
    - `result` (jsonb) - نتيجة العملية
    - `error_message` (text) - رسالة الخطأ
    - `confidence_score` (float) - درجة الثقة
    - `created_at` (timestamptz)

  3. Security
    - Enable RLS
    - Admin-only policies
*/

-- جدول إعدادات AI
CREATE TABLE IF NOT EXISTS ai_control_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  auto_receipt_reading boolean DEFAULT true,
  auto_activation boolean DEFAULT true,
  auto_expiry_notifications boolean DEFAULT true,
  auto_promotional_offers boolean DEFAULT true,
  auto_trial_monitoring boolean DEFAULT true,
  auto_plan_suggestions boolean DEFAULT true,
  auto_upgrade_suggestions boolean DEFAULT true,
  error_tolerance float DEFAULT 0.15,
  autonomy_level float DEFAULT 0.95,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- إدراج الإعدادات الافتراضية
INSERT INTO ai_control_settings (id, is_enabled, error_tolerance, autonomy_level)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  0.15,
  0.95
)
ON CONFLICT (id) DO NOTHING;

-- جدول سجل AI
CREATE TABLE IF NOT EXISTS ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'success',
  result jsonb DEFAULT '{}',
  error_message text,
  confidence_score float,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_ai_logs_action_type ON ai_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_action_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_action_logs(user_id);

-- Enable RLS
ALTER TABLE ai_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

-- Policies for ai_control_settings
CREATE POLICY "Admins can view AI settings"
  ON ai_control_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update AI settings"
  ON ai_control_settings FOR UPDATE
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

-- Policies for ai_action_logs
CREATE POLICY "Admins can view AI logs"
  ON ai_action_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Service role can insert AI logs"
  ON ai_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log AI actions
CREATE OR REPLACE FUNCTION log_ai_action(
  p_action_type text,
  p_action_data jsonb DEFAULT '{}',
  p_status text DEFAULT 'success',
  p_result jsonb DEFAULT '{}',
  p_error_message text DEFAULT NULL,
  p_confidence_score float DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO ai_action_logs (
    action_type,
    action_data,
    status,
    result,
    error_message,
    confidence_score,
    user_id
  )
  VALUES (
    p_action_type,
    p_action_data,
    p_status,
    p_result,
    p_error_message,
    p_confidence_score,
    COALESCE(p_user_id, auth.uid())
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get AI statistics
CREATE OR REPLACE FUNCTION get_ai_statistics(
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'success_count', COUNT(*) FILTER (WHERE status = 'success'),
    'error_count', COUNT(*) FILTER (WHERE status = 'error'),
    'warning_count', COUNT(*) FILTER (WHERE status = 'warning'),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'success')::float / NULLIF(COUNT(*), 0) * 100)::numeric,
      2
    ),
    'avg_confidence', ROUND(AVG(confidence_score)::numeric, 2),
    'actions_by_type', (
      SELECT jsonb_object_agg(
        action_type,
        count
      )
      FROM (
        SELECT action_type, COUNT(*) as count
        FROM ai_action_logs
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY action_type
      ) t
    )
  ) INTO v_stats
  FROM ai_action_logs
  WHERE created_at >= NOW() - (p_days || ' days')::interval;

  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$;
