/*
  # نظام حسابات المستثمرين B2F
  
  ## نظرة عامة
  إضافة نظام حسابات المستثمرين لإدارة هوية المستثمرين ومتابعة طلباتهم
  
  ## الجدول الجديد
  
  ### b2f_investor_accounts
  - `id` (uuid, primary key)
  - `contact_name` (text) - اسم المستثمر
  - `contact_phone` (text, unique) - رقم الجوال (فريد)
  - `pin_code` (text) - رمز PIN للدخول
  - `is_profile_complete` (boolean) - هل تم استكمال البيانات؟
  - `city` (text) - المدينة
  - `region` (text) - المنطقة
  - `investor_type` (text) - نوع المستثمر
  - `total_requests` (integer) - عدد الطلبات
  - `created_at`, `updated_at`
  
  ## الربط مع الجداول الموجودة
  - إضافة `investor_account_id` في `b2f_investment_requests`
  
  ## الأمان
  - RLS مفعل
  - إنشاء وعرض متاح للجميع
  - التحديث متاح للجميع للسماح باستكمال البيانات
*/

-- ===============================================
-- 1. إنشاء جدول حسابات المستثمرين
-- ===============================================

CREATE TABLE IF NOT EXISTS b2f_investor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_phone text NOT NULL UNIQUE,
  pin_code text DEFAULT '',
  is_profile_complete boolean DEFAULT false,
  city text DEFAULT '',
  region text DEFAULT '',
  investor_type text DEFAULT '' CHECK (investor_type IN ('', 'individual', 'company', 'foundation')),
  total_requests integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================================
-- 2. تفعيل RLS
-- ===============================================

ALTER TABLE b2f_investor_accounts ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بإنشاء حساب جديد
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

-- السماح للجميع بتحديث حساباتهم
CREATE POLICY "Anyone can update investor accounts"
  ON b2f_investor_accounts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- 3. ربط الحسابات بالطلبات
-- ===============================================

-- إضافة عمود investor_account_id للطلبات
ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS investor_account_id uuid 
REFERENCES b2f_investor_accounts(id) ON DELETE SET NULL;

-- ===============================================
-- 4. الفهارس للأداء
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone
  ON b2f_investor_accounts(contact_phone);

CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_created_at
  ON b2f_investor_accounts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_account
  ON b2f_investment_requests(investor_account_id);

-- ===============================================
-- 5. دالة لتحديث updated_at تلقائياً
-- ===============================================

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

-- ===============================================
-- 6. دالة لتحديث عداد الطلبات
-- ===============================================

CREATE OR REPLACE FUNCTION update_investor_account_total_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.investor_account_id IS NOT NULL THEN
    UPDATE b2f_investor_accounts
    SET total_requests = (
      SELECT COUNT(*)
      FROM b2f_investment_requests
      WHERE investor_account_id = NEW.investor_account_id
    )
    WHERE id = NEW.investor_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث العداد عند إضافة/تحديث طلب
DROP TRIGGER IF EXISTS update_investor_account_requests_count_trigger ON b2f_investment_requests;
CREATE TRIGGER update_investor_account_requests_count_trigger
  AFTER INSERT OR UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_account_total_requests();
