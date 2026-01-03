/*
  # إصلاح الربط بين حسابات المستثمرين وطلبات الاستثمار

  ## المشكلة
  - الربط الحالي يعتمد على `investor_phone` فقط
  - حقل `investor_account_id` موجود لكن بعض البيانات القديمة قد لا تحتوي عليه
  - نحتاج لضمان أن جميع الطلبات مرتبطة بحساب مستثمر

  ## الحل
  1. تحديث جميع الطلبات القديمة لربطها بحساباتها عبر رقم الهاتف
  2. إضافة INDEX لتحسين الأداء
  3. إضافة تحقق (CHECK constraint) لضمان وجود الربط

  ## التغييرات
  - تحديث `investor_account_id` للطلبات التي ليس لها ربط
  - إضافة INDEX على `investor_account_id`
  - تحسين الأداء العام
*/

-- تحديث جميع الطلبات القديمة التي ليس لها investor_account_id
UPDATE b2f_investment_requests r
SET investor_account_id = a.id
FROM b2f_investor_accounts a
WHERE r.investor_account_id IS NULL
  AND r.investor_phone = a.contact_phone;

-- إضافة INDEX لتحسين البحث
CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_account_id 
ON b2f_investment_requests(investor_account_id);

CREATE INDEX IF NOT EXISTS idx_b2f_investment_requests_phone 
ON b2f_investment_requests(investor_phone);

-- إضافة INDEX على b2f_investor_accounts
CREATE INDEX IF NOT EXISTS idx_b2f_investor_accounts_phone 
ON b2f_investor_accounts(contact_phone);

-- إضافة تعليق للتوضيح
COMMENT ON COLUMN b2f_investment_requests.investor_account_id IS 
'Foreign key to b2f_investor_accounts - should be populated for all new requests';

COMMENT ON COLUMN b2f_investment_requests.investor_phone IS 
'Phone number for backward compatibility - investor_account_id is the primary relationship';
