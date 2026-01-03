/*
  # إضافة حقلي الشارة واللون لجدول الباقات

  1. التغييرات
    - إضافة عمود `badge` (text) - شارة الباقة مثل "الأكثر شعبية"
    - إضافة عمود `color` (text) - لون الباقة بصيغة hex مثل "#10b981"

  2. القيم الافتراضية
    - badge: NULL (اختياري)
    - color: '#10b981' (أخضر زمردي افتراضي)
*/

-- إضافة عمود الشارة
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS badge text;

-- إضافة عمود اللون
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#10b981';

-- تعليق على الأعمدة الجديدة
COMMENT ON COLUMN subscription_plans.badge IS 'شارة الباقة المخصصة (مثال: الأكثر شعبية)';
COMMENT ON COLUMN subscription_plans.color IS 'لون الباقة بصيغة HEX';
