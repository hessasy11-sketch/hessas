/*
  # حذف نظام الشريط الجانبي B2F بالكامل

  ## التفاصيل
  تم اتخاذ قرار نهائي بحذف نظام الشريط الجانبي B2F القديم
  لأنه كان سبب التعقيد والمشاكل المتكررة.

  سيتم إعادة بناء القسم من جديد بهيكل نظيف بالكامل:
  سليدر → بطاقات → تفاصيل عرض → حجز → ثم شريط حجوزات جديد ومخصص

  ## الجداول المحذوفة
  - `b2f_sidebar_config` - جدول إعدادات الشريط الجانبي
  - `b2f_sidebar_items` - جدول عناصر الشريط الجانبي

  ## الوظائف المحذوفة
  - `update_b2f_sidebar_updated_at()` - وظيفة تحديث الطابع الزمني

  ## السياسات المحذوفة
  جميع سياسات RLS المتعلقة بالجداول أعلاه

  ## الفهارس المحذوفة
  جميع الفهارس المتعلقة بالجداول أعلاه
*/

-- إزالة الجداول من realtime أولاً
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'b2f_sidebar_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE b2f_sidebar_config;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'b2f_sidebar_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE b2f_sidebar_items;
  END IF;
END $$;

-- حذف الجداول (سيتم حذف Triggers و Policies تلقائياً)
DROP TABLE IF EXISTS b2f_sidebar_items CASCADE;
DROP TABLE IF EXISTS b2f_sidebar_config CASCADE;

-- حذف الوظيفة المخصصة
DROP FUNCTION IF EXISTS update_b2f_sidebar_updated_at() CASCADE;
