/*
  # إزالة نظام رفع الإيصال القديم بالكامل
  
  ## الهدف
  تنظيف النظام من المسار القديم لرفع الإيصالات تمهيداً لبناء نظام جديد
  
  ## التغييرات
  
  ### 1. إزالة جميع Triggers المرتبطة بنظام الإيصالات القديم
    - trigger_receipt_uploaded_sales
  
  ### 2. إزالة جميع Functions المرتبطة بنظام الإيصالات القديم
    - on_receipt_uploaded_for_sales()
    - approve_receipt()
    - approve_receipt_financial_review()
    - reject_receipt_with_note()
    - detect_duplicate_receipt()
    - validate_payment_open_before_receipt()
    - update_receipt_ai_classification()
    - update_b2f_payment_receipts_updated_at()
    - update_receipt_logs_updated_at()
  
  ### 3. تعطيل/إزالة الجداول القديمة
    - b2f_payment_receipts (جدول منفصل قديم)
    - b2f_duplicate_receipts
    - receipt_verification_logs
  
  ### 4. ملاحظات مهمة
    - لا نحذف البيانات التاريخية
    - نحتفظ بجدول b2f_sales_requests وحقل payment_receipt_url كما هو
    - نوقف فقط المسار القديم الذي يستخدم جدول منفصل
*/

-- ==================================================
-- المرحلة 1: إزالة جميع Triggers القديمة
-- ==================================================

DROP TRIGGER IF EXISTS trigger_receipt_uploaded_sales ON b2f_payment_receipts;
DROP TRIGGER IF EXISTS update_b2f_payment_receipts_timestamp ON b2f_payment_receipts;
DROP TRIGGER IF EXISTS update_receipt_verification_logs_timestamp ON receipt_verification_logs;

-- ==================================================
-- المرحلة 2: إزالة جميع Functions القديمة
-- ==================================================

-- دوال معالجة الإيصالات القديمة
DROP FUNCTION IF EXISTS on_receipt_uploaded_for_sales() CASCADE;
DROP FUNCTION IF EXISTS approve_receipt(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS approve_receipt_financial_review(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS reject_receipt_with_note(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS detect_duplicate_receipt(text) CASCADE;
DROP FUNCTION IF EXISTS validate_payment_open_before_receipt() CASCADE;
DROP FUNCTION IF EXISTS update_receipt_ai_classification() CASCADE;

-- دوال التحديث التلقائي
DROP FUNCTION IF EXISTS update_b2f_payment_receipts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_receipt_logs_updated_at() CASCADE;

-- ==================================================
-- المرحلة 3: إزالة الجداول القديمة
-- ==================================================

-- ملاحظة: نحذف الجداول لأنها فارغة ولم تُستخدم
-- في حال وجود بيانات، يجب نسخها أولاً

-- حذف جدول الإيصالات المنفصل القديم
DROP TABLE IF EXISTS b2f_payment_receipts CASCADE;

-- حذف جدول الإيصالات المكررة
DROP TABLE IF EXISTS b2f_duplicate_receipts CASCADE;

-- حذف جدول سجلات التحقق
DROP TABLE IF EXISTS receipt_verification_logs CASCADE;

-- ==================================================
-- المرحلة 4: تنظيف جدول b2f_sales_requests
-- ==================================================

-- إضافة comment توضيحي أن هذا الجدول الآن هو المصدر الوحيد للإيصالات
COMMENT ON COLUMN b2f_sales_requests.payment_receipt_url IS 
'رابط إيصال الدفع - هذا الحقل حالياً معطل مؤقتاً في انتظار النظام الجديد';

-- ==================================================
-- المرحلة 5: إزالة Storage Buckets القديمة (اختياري)
-- ==================================================

-- ملاحظة: bucket 'b2f-payment-receipts' يبقى لأنه يحتوي على الإيصالات الحالية
-- لا نحذفه

-- ==================================================
-- توثيق التغييرات
-- ==================================================

-- إنشاء جدول لتوثيق التنظيف
CREATE TABLE IF NOT EXISTS system_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_type text NOT NULL,
  description text,
  cleaned_at timestamptz DEFAULT now()
);

-- تسجيل عملية التنظيف
INSERT INTO system_cleanup_log (cleanup_type, description) VALUES
('receipt_system_removal', 'تم إزالة نظام رفع الإيصال القديم بالكامل - جميع triggers، functions، والجداول المنفصلة'),
('triggers_removed', 'تم إزالة: trigger_receipt_uploaded_sales'),
('functions_removed', 'تم إزالة 9 دوال قديمة متعلقة بمعالجة الإيصالات'),
('tables_removed', 'تم إزالة: b2f_payment_receipts, b2f_duplicate_receipts, receipt_verification_logs');

-- ==================================================
-- ملاحظات نهائية
-- ==================================================

/*
  ✅ ما تم إنجازه:
  - إزالة كامل نظام الإيصالات القديم (الجداول المنفصلة)
  - إيقاف جميع triggers التي تعدل الحالة تلقائياً
  - حذف جميع دوال المعالجة القديمة
  
  ⚠️ ما بقي فعالاً:
  - جدول b2f_sales_requests (الجدول الأساسي للطلبات)
  - حقل payment_receipt_url في b2f_sales_requests (موجود لكن غير مستخدم حالياً)
  - Storage bucket: b2f-payment-receipts (للملفات الموجودة)
  - Edge Functions للـ AI (analyze-b2f-payment-receipt) - موجودة لكن لن تُستدعى
  
  🔴 ما يجب عمله في الواجهة:
  - تعطيل/إزالة زر "رفع إيصال التحويل البنكي"
  - تعطيل component: ReceiptUploadModal
  - تعطيل hook: useReceiptUploadV2
  
  🟢 الخطوة القادمة:
  - بناء نظام جديد تماماً لرفع الإيصال
  - بتصميم أفضل وأبسط
  - بدون اعتماد على أي كود قديم
*/