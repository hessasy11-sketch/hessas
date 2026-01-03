/*
  # نظام التفعيل والدفع للاشتراكات

  1. Changes to user_subscriptions
    - إضافة حقل `payment_status` - حالة الدفع (pending/approved/needs_review/rejected)
    - إضافة حقل `receipt_url` - رابط الإيصال المرفوع
    - إضافة حقل `ai_decision` - قرار الذكاء الصناعي
    - إضافة حقل `ai_confidence` - نسبة ثقة الذكاء الصناعي
    - إضافة حقل `temporary_activation` - تفعيل مؤقت (24 ساعة)
    - إضافة حقل `temporary_expires_at` - انتهاء التفعيل المؤقت
    - إضافة حقل `ai_monitoring_enabled` - تفعيل مراقبة الذكاء الصناعي
  
  2. Notes
    - pending_payment: في انتظار الدفع
    - approved: تم الموافقة والتفعيل
    - needs_review: يحتاج مراجعة (تفعيل مؤقت 24 ساعة)
    - rejected: تم الرفض
*/

-- إضافة حقل حالة الدفع
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN payment_status text DEFAULT 'pending_payment';
  END IF;
END $$;

-- إضافة حقل رابط الإيصال
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN receipt_url text;
  END IF;
END $$;

-- إضافة حقل قرار الذكاء الصناعي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'ai_decision'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN ai_decision text;
  END IF;
END $$;

-- إضافة حقل نسبة ثقة الذكاء الصناعي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN ai_confidence numeric;
  END IF;
END $$;

-- إضافة حقل التفعيل المؤقت
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'temporary_activation'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN temporary_activation boolean DEFAULT false;
  END IF;
END $$;

-- إضافة حقل انتهاء التفعيل المؤقت
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'temporary_expires_at'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN temporary_expires_at timestamp with time zone;
  END IF;
END $$;

-- إضافة حقل مراقبة الذكاء الصناعي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'ai_monitoring_enabled'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN ai_monitoring_enabled boolean DEFAULT false;
  END IF;
END $$;

-- إنشاء جدول سجل قرارات الذكاء الصناعي
CREATE TABLE IF NOT EXISTS subscription_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  action text NOT NULL,
  decision text NOT NULL,
  confidence numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view AI logs"
  ON subscription_ai_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
