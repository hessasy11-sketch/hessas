/*
  # إضافة حقل رقم الجوال للبائع

  1. التعديلات
    - إضافة عمود seller_phone إلى جدول auctions
    - يحتوي على رقم واتساب البائع
    - يُستخدم في زر واتساب الخاص بالمزاد
  
  2. الأهمية
    - يسمح للمشترين بالتواصل المباشر مع البائع
    - لا يظهر الرقم في الواجهة، فقط في رابط واتساب
*/

-- إضافة عمود رقم جوال البائع
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'seller_phone'
  ) THEN
    ALTER TABLE auctions ADD COLUMN seller_phone text;
  END IF;
END $$;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN auctions.seller_phone IS 'رقم واتساب البائع للتواصل المباشر';
