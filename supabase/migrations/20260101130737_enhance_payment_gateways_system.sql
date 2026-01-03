/*
  # تحسين نظام بوابات الدفع - إضافة إدارة الحالات المتقدمة

  1. التعديلات على الجدول
    - إضافة `visibility_status` - حالة الظهور (visible/disabled_visible/hidden)
    - إضافة `setup_status` - حالة الإعداد (ready/test/live_ready)
    - إضافة `test_connection_status` - نتيجة آخر اختبار اتصال
    - إضافة `test_connection_at` - تاريخ آخر اختبار
    - إضافة `display_order` - ترتيب العرض

  2. الأمان
    - تحديث السياسات الموجودة
*/

-- إضافة الأعمدة الجديدة
ALTER TABLE b2f_payment_gateways_config
ADD COLUMN IF NOT EXISTS visibility_status text DEFAULT 'visible' CHECK (visibility_status IN ('visible', 'disabled_visible', 'hidden')),
ADD COLUMN IF NOT EXISTS setup_status text DEFAULT 'test' CHECK (setup_status IN ('ready', 'test', 'live_ready')),
ADD COLUMN IF NOT EXISTS test_connection_status text DEFAULT 'not_tested' CHECK (test_connection_status IN ('not_tested', 'success', 'failed')),
ADD COLUMN IF NOT EXISTS test_connection_at timestamptz,
ADD COLUMN IF NOT EXISTS test_connection_message text,
ADD COLUMN IF NOT EXISTS display_order int DEFAULT 0,
ADD COLUMN IF NOT EXISTS disabled_message text;

-- تحديث البيانات الموجودة
UPDATE b2f_payment_gateways_config
SET
  visibility_status = CASE
    WHEN enabled = true THEN 'visible'
    ELSE 'disabled_visible'
  END,
  setup_status = CASE
    WHEN code = 'bank_transfer' THEN 'live_ready'
    ELSE 'test'
  END,
  display_order = CASE
    WHEN code = 'mada' THEN 1
    WHEN code = 'cards' THEN 2
    WHEN code = 'tabby' THEN 3
    WHEN code = 'tamara' THEN 4
    WHEN code = 'bank_transfer' THEN 5
    ELSE 99
  END,
  disabled_message = CASE
    WHEN enabled = false THEN 'سيتم تفعيل هذه الطريقة قريباً بعد الربط الرسمي'
    ELSE NULL
  END
WHERE visibility_status IS NULL;

-- فهرس للترتيب
CREATE INDEX IF NOT EXISTS idx_payment_gateways_display_order ON b2f_payment_gateways_config(display_order);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_visibility ON b2f_payment_gateways_config(visibility_status);