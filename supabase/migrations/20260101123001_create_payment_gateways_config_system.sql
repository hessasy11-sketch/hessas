/*
  # نظام إعدادات بوابات الدفع

  1. الجداول الجديدة
    - `b2f_payment_gateways_config`
      - `id` (uuid, primary key)
      - `code` (text, unique) - الكود الثابت للبوابة
      - `name_ar` (text) - الاسم بالعربي
      - `type` (text) - نوع البوابة (electronic/bank_transfer/bnpl)
      - `enabled` (boolean) - حالة التفعيل
      - `config` (jsonb) - إعدادات البوابة (API Keys، بيانات الحساب، إلخ)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS
    - سياسات للإدارة فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_payment_gateways_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  type text NOT NULL CHECK (type IN ('electronic', 'bank_transfer', 'bnpl')),
  description text,
  icon_color text DEFAULT 'blue',
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_payment_gateways_config ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "Allow public read payment gateways config"
  ON b2f_payment_gateways_config
  FOR SELECT
  TO public
  USING (true);

-- سياسة التحديث للإدارة فقط
CREATE POLICY "Allow admin update payment gateways config"
  ON b2f_payment_gateways_config
  FOR UPDATE
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- إدراج البوابات الخمسة الافتراضية
INSERT INTO b2f_payment_gateways_config (code, name_ar, name_en, type, description, icon_color, enabled, config)
VALUES
  (
    'mada',
    'مدى',
    'Mada',
    'electronic',
    'بطاقات مدى المحلية',
    'blue',
    true,
    '{
      "environment": "test",
      "merchant_id": "",
      "api_key": "",
      "api_secret": "",
      "callback_url": ""
    }'::jsonb
  ),
  (
    'cards',
    'البطاقات / ApplePay / STC',
    'Cards / ApplePay / STC',
    'electronic',
    'بطاقات Visa, Mastercard, ApplePay, STC Pay',
    'purple',
    true,
    '{
      "environment": "test",
      "merchant_id": "",
      "api_key": "",
      "api_secret": "",
      "callback_url": "",
      "supports_apple_pay": true,
      "supports_stc_pay": true
    }'::jsonb
  ),
  (
    'tabby',
    'تابي',
    'Tabby',
    'bnpl',
    'الدفع بالتقسيط - اشتري الآن وادفع لاحقاً',
    'orange',
    false,
    '{
      "environment": "test",
      "merchant_id": "",
      "public_key": "",
      "secret_key": "",
      "webhook_secret": ""
    }'::jsonb
  ),
  (
    'tamara',
    'تمارا',
    'Tamara',
    'bnpl',
    'الدفع بالتقسيط - قسّم مشترياتك',
    'teal',
    false,
    '{
      "environment": "test",
      "merchant_id": "",
      "api_token": "",
      "notification_token": ""
    }'::jsonb
  ),
  (
    'bank_transfer',
    'التحويل البنكي',
    'Bank Transfer',
    'bank_transfer',
    'تحويل بنكي مباشر مع رفع إثبات',
    'emerald',
    true,
    '{
      "bank_name": "",
      "account_name": "",
      "account_number": "",
      "iban": "",
      "notes": ""
    }'::jsonb
  )
ON CONFLICT (code) DO NOTHING;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_payment_gateway_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_gateway_config_updated_at
  BEFORE UPDATE ON b2f_payment_gateways_config
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_gateway_updated_at();

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_payment_gateways_enabled ON b2f_payment_gateways_config(enabled);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_type ON b2f_payment_gateways_config(type);
