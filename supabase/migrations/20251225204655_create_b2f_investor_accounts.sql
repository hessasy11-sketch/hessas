/*
  # نظام حسابات المستثمرين الزراعيين (B2F)

  1. جدول جديد
    - `b2f_investor_accounts`
      - `id` (uuid, primary key)
      - `contact_name` (text) - الاسم
      - `contact_phone` (text) - رقم الجوال (فريد)
      - `is_profile_complete` (boolean) - هل الحساب مكتمل؟
      - `city` (text) - المدينة (اختياري)
      - `region` (text) - المنطقة (اختياري)
      - `investor_type` (text) - نوع المستثمر (اختياري)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. تحديث جدول `investor_intent_requests`
    - إضافة `investor_account_id` للربط مع الحساب

  3. الأمان
    - تفعيل RLS
    - السماح للجميع بإنشاء حساب
    - السماح للجميع بعرض حسابهم عبر رقم الجوال
*/

-- إنشاء جدول حسابات المستثمرين
CREATE TABLE IF NOT EXISTS b2f_investor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_phone text NOT NULL UNIQUE,
  is_profile_complete boolean DEFAULT false,
  city text DEFAULT '',
  region text DEFAULT '',
  investor_type text DEFAULT '' CHECK (investor_type IN ('', 'individual', 'company', 'foundation')),
  total_requests integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بإنشاء حساب
CREATE POLICY "Anyone can create investor account"
  ON b2f_investor_accounts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح للجميع بعرض الحسابات
CREATE POLICY "Anyone can view investor accounts"
  ON b2f_investor_accounts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح بتحديث الحسابات
CREATE POLICY "Anyone can update investor accounts"
  ON b2f_investor_accounts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- إضافة عمود investor_account_id لجدول الطلبات
ALTER TABLE investor_intent_requests
ADD COLUMN IF NOT EXISTS investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE SET NULL;

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_investor_accounts_phone
  ON b2f_investor_accounts(contact_phone);

CREATE INDEX IF NOT EXISTS idx_investor_accounts_created_at
  ON b2f_investor_accounts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_account
  ON investor_intent_requests(investor_account_id);

-- وظيفة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_b2f_investor_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS update_b2f_investor_accounts_updated_at_trigger ON b2f_investor_accounts;
CREATE TRIGGER update_b2f_investor_accounts_updated_at_trigger
  BEFORE UPDATE ON b2f_investor_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_investor_accounts_updated_at();

-- وظيفة لتحديث عداد الطلبات
CREATE OR REPLACE FUNCTION update_investor_account_total_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.investor_account_id IS NOT NULL THEN
    UPDATE b2f_investor_accounts
    SET total_requests = (
      SELECT COUNT(*)
      FROM investor_intent_requests
      WHERE investor_account_id = NEW.investor_account_id
    )
    WHERE id = NEW.investor_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث العداد
DROP TRIGGER IF EXISTS update_investor_account_requests_count_trigger ON investor_intent_requests;
CREATE TRIGGER update_investor_account_requests_count_trigger
  AFTER INSERT OR UPDATE ON investor_intent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_account_total_requests();
