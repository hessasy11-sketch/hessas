/*
  # حذف نظام الأقسام الخمسة بالكامل
  
  هذا الـ migration يقوم بحذف جميع الجداول والبيانات المتعلقة بنظام الأقسام الخمسة:
  - public (المزادات العامة)
  - companies (مزادات الشركات)
  - platform (المزادات الرسمية)
  - groups (مزادات القروبات)
  - collectibles (المقتنيات النادرة)
  
  ## الجداول التي سيتم حذفها:
  1. `group_category_settings` - إعدادات التصنيفات للقروبات
  2. `group_members` - أعضاء القروبات
  3. `groups` - جدول القروبات
  4. `chat_messages` - رسائل الدردشة
  5. `bids` - المزايدات
  6. `auctions` - جدول المزادات الرئيسي
  7. `auction_categories` - التصنيفات
  8. سيتم تعديل `profiles` لإزالة أنواع المستخدمين المتعلقة بالأقسام
  
  ## ملاحظات مهمة:
  - سيتم حذف جميع البيانات بشكل نهائي (لا يمكن استرجاعها)
  - سيتم حذف جميع المزادات والمزايدات والرسائل
  - سيتم الحفاظ على جدول profiles لكن سيتم تبسيط أنواع المستخدمين
*/

-- حذف الجداول بالترتيب الصحيح (من التابع إلى الرئيسي)

-- 1. حذف group_category_settings
DROP TABLE IF EXISTS group_category_settings CASCADE;

-- 2. حذف group_members
DROP TABLE IF EXISTS group_members CASCADE;

-- 3. حذف groups
DROP TABLE IF EXISTS groups CASCADE;

-- 4. حذف chat_messages
DROP TABLE IF EXISTS chat_messages CASCADE;

-- 5. حذف bids
DROP TABLE IF EXISTS bids CASCADE;

-- 6. حذف auctions
DROP TABLE IF EXISTS auctions CASCADE;

-- 7. حذف auction_categories
DROP TABLE IF EXISTS auction_categories CASCADE;

-- 8. تعديل جدول profiles لتبسيط أنواع المستخدمين
-- إزالة القيد القديم
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_user_type_check'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_user_type_check;
  END IF;
END $$;

-- إضافة قيد بسيط: user (مستخدم عادي) أو admin (مدير)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user', 'admin'));

-- تحديث جميع المستخدمين الحاليين إلى 'user'
UPDATE profiles SET user_type = 'user';

-- تعديل القيمة الافتراضية
ALTER TABLE profiles
  ALTER COLUMN user_type SET DEFAULT 'user';
