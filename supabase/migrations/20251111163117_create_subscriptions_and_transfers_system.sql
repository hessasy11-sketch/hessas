/*
  # إنشاء نظام الاشتراكات والتحويلات البنكية الذكي

  1. جداول جديدة
    - `subscription_plans` - الباقات المتاحة
    - `user_subscriptions` - اشتراكات المستخدمين
    - `bank_transfers` - التحويلات البنكية مع التحليل الذكي

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للقراءة والكتابة

  3. الميزات الذكية
    - حالات التحليل الذكي (ai_status)
    - درجة الثقة (ai_confidence)
    - قرار المشرف (admin_decision)
    - تتبع التعلم الذاتي

  4. الملاحظات
    - النظام جاهز للربط بـ OCR API
    - يدعم المحاكاة الذكية حالياً
    - قابل للترقية دون تعديل الهيكل
*/

-- جدول الباقات
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb DEFAULT '[]',
  features_ar jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول اشتراكات المستخدمين
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'expired', 'cancelled')) DEFAULT 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  auto_renew boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول التحويلات البنكية الذكية
CREATE TABLE IF NOT EXISTS bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  -- بيانات التحويل
  amount numeric(10, 2) NOT NULL,
  expected_amount numeric(10, 2) NOT NULL,
  transfer_date date,
  reference_number text,
  
  -- الذكاء المحدود
  ai_status text CHECK (ai_status IN ('pending', 'matched', 'warning', 'rejected', 'manual_review')) DEFAULT 'pending',
  ai_confidence numeric(5, 2) DEFAULT 0, -- من 0 إلى 100
  ai_notes text,
  ai_extracted_data jsonb DEFAULT '{}',
  
  -- قرار الإدارة
  admin_decision text CHECK (admin_decision IN ('pending', 'approved', 'rejected', 'needs_review')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  -- الملفات
  receipt_url text,
  
  -- التتبع
  status text CHECK (status IN ('pending_upload', 'analyzing', 'pending_review', 'approved', 'rejected')) DEFAULT 'pending_upload',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

-- سياسات الباقات (الكل يقرأ)
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- سياسات الاشتراكات
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات التحويلات
CREATE POLICY "Users can view own transfers"
  ON bank_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create transfers"
  ON bank_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending transfers"
  ON bank_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending_upload', 'analyzing'));

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user_id ON bank_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON bank_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_ai_status ON bank_transfers(ai_status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_tracking ON bank_transfers(tracking_number);

-- دالة لتوليد رقم تتبع فريد
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer := 0;
BEGIN
  LOOP
    new_number := 'TRX-' || LPAD(FLOOR(RANDOM() * 9999 + 1000)::text, 4, '0');
    
    IF NOT EXISTS (SELECT 1 FROM bank_transfers WHERE tracking_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
    IF counter > 10 THEN
      new_number := 'TRX-' || EXTRACT(EPOCH FROM NOW())::bigint;
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تحديث التاريخ تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bank_transfers_updated_at
  BEFORE UPDATE ON bank_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- إدراج الباقات الافتراضية
INSERT INTO subscription_plans (name, name_ar, description_ar, price, duration_days, features_ar, display_order, is_active)
VALUES 
  (
    'Free',
    'مجانية',
    'للمستخدمين الجدد والتجربة',
    0,
    365,
    '["عرض المزادات فقط", "متابعة 5 مزادات", "دعم محدود"]'::jsonb,
    1,
    true
  ),
  (
    'Agricultural',
    'زراعية',
    'للمزارعين والتجار الصغار',
    150,
    30,
    '["إضافة 20 مزاد شهرياً", "متابعة غير محدودة", "دعم أولوية", "تقارير شهرية"]'::jsonb,
    2,
    true
  ),
  (
    'Golden',
    'ذهبية',
    'للشركات والتجار الكبار',
    300,
    30,
    '["مزادات غير محدودة", "صفحة شركة مخصصة", "إعلانات مميزة", "دعم VIP على مدار الساعة", "تقارير تفصيلية"]'::jsonb,
    3,
    true
  )
ON CONFLICT DO NOTHING;

-- تعليقات توضيحية
COMMENT ON TABLE subscription_plans IS 'باقات الاشتراك المتاحة في المنصة';
COMMENT ON TABLE user_subscriptions IS 'اشتراكات المستخدمين الحالية والسابقة';
COMMENT ON TABLE bank_transfers IS 'التحويلات البنكية مع التحليل الذكي';
COMMENT ON COLUMN bank_transfers.ai_status IS 'حالة التحليل الذكي للإيصال';
COMMENT ON COLUMN bank_transfers.ai_confidence IS 'درجة ثقة الذكاء الاصطناعي من 0 إلى 100';
COMMENT ON COLUMN bank_transfers.tracking_number IS 'رقم تتبع فريد للتحويل';
