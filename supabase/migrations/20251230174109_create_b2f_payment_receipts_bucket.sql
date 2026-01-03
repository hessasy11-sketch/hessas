/*
  # إنشاء bucket لإيصالات الدفع B2F

  1. المشكلة:
    - الـ bucket 'b2f-payment-receipts' غير موجود
    - السياسات موجودة لكن بدون bucket!
    - نتيجة: فشل الرفع

  2. الحل:
    - إنشاء الـ bucket
*/

-- إنشاء bucket للإيصالات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'b2f-payment-receipts',
  'b2f-payment-receipts',
  true,  -- public للوصول السهل
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;