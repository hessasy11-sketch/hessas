/*
  # إضافة نظام الذكاء الصناعي للباقات

  ## الجداول الجديدة
  
  ### 1. subscription_requests
    - جدول طلبات الاشتراك مع تحليل الذكاء الصناعي
    - يحتوي على نتائج تحليل الإيصالات
    - حالات التفعيل التلقائي والمراجعة الإدارية

  ### 2. ai_validation_bank
    - بنك التعلم الذاتي للذكاء الصناعي
    - يسجل توقعات الذكاء وقرارات الإدارة
    - يستخدم لتحسين الدقة مع الوقت

  ## الدوال
  
  ### 1. auto_activate_subscription
    - تفعيل تلقائي للاشتراك بعد تحليل الذكاء الصناعي
    
  ### 2. check_user_subscription
    - التحقق من صلاحية المستخدم لميزة معينة

  ## الأمان
    - RLS على جميع الجداول
    - المستخدمون يرون طلباتهم فقط
    - الإدارة ترى جميع الطلبات
*/

-- إنشاء جدول طلبات الاشتراك
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE NOT NULL,
  receipt_url text NOT NULL,
  ai_analysis_result jsonb DEFAULT '{}'::jsonb,
  detected_amount numeric(10,2),
  transfer_date date,
  transfer_reference text,
  ai_confidence_score numeric(3,2) DEFAULT 0,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  activation_by text CHECK (activation_by IN ('AI', 'Admin')),
  activation_time timestamptz,
  admin_review_notes text,
  admin_reviewed_by uuid REFERENCES profiles(id),
  admin_review_time timestamptz,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'active', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription requests"
  ON subscription_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create subscription requests"
  ON subscription_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all subscription requests"
  ON subscription_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update subscription requests"
  ON subscription_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- إنشاء جدول بنك التعلم الذاتي
CREATE TABLE IF NOT EXISTS ai_validation_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES subscription_requests(id) ON DELETE CASCADE NOT NULL,
  ai_prediction text NOT NULL,
  admin_decision text NOT NULL,
  was_correct boolean NOT NULL,
  learning_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_validation_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view ai learning data"
  ON ai_validation_bank FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Only admins can add ai learning data"
  ON ai_validation_bank FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- إنشاء دالة للتحقق من صلاحية الاشتراك
CREATE OR REPLACE FUNCTION check_user_subscription(user_uuid uuid, feature_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_feature boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.is_active = true
    AND us.end_date > now()
    AND sp.features @> to_jsonb(feature_name)
  ) INTO has_feature;
  
  RETURN has_feature;
END;
$$;

-- إنشاء دالة للتفعيل التلقائي
CREATE OR REPLACE FUNCTION auto_activate_subscription(request_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req subscription_requests;
  plan subscription_plans;
  result jsonb;
BEGIN
  SELECT * INTO req FROM subscription_requests WHERE id = request_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  SELECT * INTO plan FROM subscription_plans WHERE id = req.plan_id;
  
  INSERT INTO user_subscriptions (user_id, plan_id, request_id, end_date)
  VALUES (
    req.user_id,
    req.plan_id,
    request_uuid,
    now() + (plan.duration_days || ' days')::interval
  );
  
  UPDATE subscription_requests
  SET 
    status = 'active',
    activation_by = 'AI',
    activation_time = now(),
    validation_status = 'auto_approved',
    updated_at = now()
  WHERE id = request_uuid;
  
  RETURN jsonb_build_object('success', true, 'message', 'Subscription activated');
END;
$$;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_subscription_requests_user_id ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_validation ON subscription_requests(validation_status);
