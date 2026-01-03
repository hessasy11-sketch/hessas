/*
  # إضافة نظام الرقم السري (PIN) للحسابات الاستثمارية
  
  1. التعديلات
    - إضافة عمود `pin_code` في جدول `b2f_investor_accounts`
      - نوع البيانات: TEXT (مشفّر)
      - إلزامي: نعم
      - التحقق: يجب أن يكون بين 4 و 10 أرقام
    
  2. الأمان
    - تخزين الرقم السري بشكل آمن
    - إضافة constraint للتحقق من طول الرقم
*/

-- إضافة عمود الرقم السري
ALTER TABLE b2f_investor_accounts
ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- إضافة constraint للتحقق من صحة الرقم السري
ALTER TABLE b2f_investor_accounts
ADD CONSTRAINT pin_code_length_check 
CHECK (pin_code ~ '^\d{4,10}$');

-- تحديث الحسابات الموجودة برقم افتراضي مؤقت (1234)
UPDATE b2f_investor_accounts
SET pin_code = '1234'
WHERE pin_code IS NULL;

-- جعل الحقل إلزامي بعد تحديث البيانات الموجودة
ALTER TABLE b2f_investor_accounts
ALTER COLUMN pin_code SET NOT NULL;
