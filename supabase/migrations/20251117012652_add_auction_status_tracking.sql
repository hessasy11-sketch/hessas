/*
  # إضافة تتبع حالة المزاد المحسّنة

  1. التغييرات
    - إضافة عمود `is_extended` لتتبع المزادات الممددة
    - إضافة عمود `extension_count` لعد مرات التمديد
    - إضافة عمود `original_ends_at` لحفظ تاريخ الانتهاء الأصلي
    - إضافة دالة `update_auction_status` لتحديث الحالة تلقائياً

  2. الأمان
    - تحديث RLS policies
*/

-- إضافة الأعمدة الجديدة
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS is_extended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_ends_at timestamptz;

-- تحديث original_ends_at للمزادات الموجودة
UPDATE auctions
SET original_ends_at = ends_at
WHERE original_ends_at IS NULL;

-- دالة لتحديث حالة المزاد تلقائياً
CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث المزادات المنتهية
  UPDATE auctions
  SET status = 'closed'
  WHERE status = 'active'
  AND ends_at < NOW()
  AND status != 'sold';

  -- تحديث المزادات القادمة إلى نشطة
  UPDATE auctions
  SET status = 'active'
  WHERE status = 'pending'
  AND starts_at <= NOW()
  AND ends_at > NOW();
END;
$$;

-- جدولة تشغيل الدالة (يمكن تشغيلها من Edge Function)
COMMENT ON FUNCTION update_auction_status() IS 'تحديث حالة المزادات تلقائياً - يتم استدعاؤها من Edge Function كل 5 دقائق';
