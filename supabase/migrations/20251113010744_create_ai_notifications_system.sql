/*
  # إنشاء نظام إشعارات الذكاء الصناعي

  1. الجدول الجديد
    - `ai_notifications`
      - `id` (uuid, primary key)
      - `event_type` (text) - نوع الحدث (pending_analysis, auto_activated, needs_review, suggestion)
      - `user_id` (uuid) - معرف المستخدم المعني
      - `subscription_request_id` (uuid) - معرف طلب الاشتراك
      - `plan_name` (text) - اسم الباقة
      - `message` (text) - رسالة الإشعار
      - `ai_confidence` (numeric) - درجة ثقة الذكاء الصناعي
      - `is_read` (boolean) - هل تم قراءته
      - `is_processed` (boolean) - هل تمت معالجته
      - `priority` (text) - الأولوية (high, medium, low)
      - `created_at` (timestamptz)
      - `processed_at` (timestamptz)
      - `processed_by` (uuid) - الموظف الذي عالج الإشعار

  2. الأمان
    - تفعيل RLS
    - سياسة للإداريين فقط للقراءة والتعديل

  3. الفهارس
    - فهرس على `is_processed` و `created_at` لسرعة الاستعلام

  4. Trigger
    - إنشاء إشعار تلقائي عند إضافة طلب اشتراك جديد
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS ai_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('pending_analysis', 'auto_activated', 'needs_review', 'suggestion', 'error')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_request_id uuid REFERENCES subscription_requests(id) ON DELETE CASCADE,
  plan_name text,
  message text NOT NULL,
  ai_confidence numeric(3, 2) DEFAULT 0,
  is_read boolean DEFAULT false,
  is_processed boolean DEFAULT false,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id)
);

-- تفعيل RLS
ALTER TABLE ai_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - الإداريون فقط
CREATE POLICY "Admins can view all AI notifications"
  ON ai_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type IN ('admin', 'leader')
    )
  );

CREATE POLICY "Admins can update AI notifications"
  ON ai_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type IN ('admin', 'leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type IN ('admin', 'leader')
    )
  );

CREATE POLICY "System can insert AI notifications"
  ON ai_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ai_notifications_unprocessed 
  ON ai_notifications(is_processed, created_at DESC) 
  WHERE is_processed = false;

CREATE INDEX IF NOT EXISTS idx_ai_notifications_user 
  ON ai_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_notifications_request 
  ON ai_notifications(subscription_request_id);

-- دالة لإنشاء إشعار تلقائي عند طلب اشتراك جديد
CREATE OR REPLACE FUNCTION create_ai_notification_for_subscription()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_name text;
  v_message text;
  v_event_type text;
  v_priority text;
BEGIN
  -- الحصول على اسم الباقة
  SELECT name INTO v_plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;

  -- تحديد نوع الإشعار والرسالة حسب الحالة
  IF NEW.activation_by = 'AI' AND NEW.status = 'active' THEN
    v_event_type := 'auto_activated';
    v_message := 'تم تفعيل باقة ' || v_plan_name || ' تلقائياً بواسطة الذكاء الصناعي';
    v_priority := 'low';
  ELSIF NEW.status = 'submitted' AND NEW.ai_confidence_score < 0.85 THEN
    v_event_type := 'needs_review';
    v_message := 'طلب اشتراك في باقة ' || v_plan_name || ' بحاجة إلى مراجعة يدوية';
    v_priority := 'high';
  ELSE
    v_event_type := 'pending_analysis';
    v_message := 'طلب اشتراك جديد في باقة ' || v_plan_name || ' بانتظار التحليل';
    v_priority := 'medium';
  END IF;

  -- إنشاء الإشعار
  INSERT INTO ai_notifications (
    event_type,
    user_id,
    subscription_request_id,
    plan_name,
    message,
    ai_confidence,
    priority
  ) VALUES (
    v_event_type,
    NEW.user_id,
    NEW.id,
    v_plan_name,
    v_message,
    NEW.ai_confidence_score,
    v_priority
  );

  RETURN NEW;
END;
$$;

-- ربط الدالة بـ trigger
DROP TRIGGER IF EXISTS create_ai_notification_on_subscription ON subscription_requests;
CREATE TRIGGER create_ai_notification_on_subscription
  AFTER INSERT OR UPDATE ON subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_ai_notification_for_subscription();

-- دالة للحصول على الإشعارات غير المعالجة
CREATE OR REPLACE FUNCTION get_unprocessed_ai_notifications()
RETURNS TABLE (
  id uuid,
  event_type text,
  user_id uuid,
  subscription_request_id uuid,
  plan_name text,
  message text,
  ai_confidence numeric,
  priority text,
  created_at timestamptz,
  user_name text,
  user_phone text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.event_type,
    n.user_id,
    n.subscription_request_id,
    n.plan_name,
    n.message,
    n.ai_confidence,
    n.priority,
    n.created_at,
    p.full_name as user_name,
    p.phone_number as user_phone
  FROM ai_notifications n
  LEFT JOIN profiles p ON p.id = n.user_id
  WHERE n.is_processed = false
  ORDER BY 
    CASE n.priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    n.created_at DESC;
END;
$$;

-- دالة لمعالجة إشعار
CREATE OR REPLACE FUNCTION mark_notification_processed(notification_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ai_notifications
  SET 
    is_processed = true,
    is_read = true,
    processed_at = now(),
    processed_by = auth.uid()
  WHERE id = notification_id;
END;
$$;
