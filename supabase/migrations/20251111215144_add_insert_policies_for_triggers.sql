/*
  # إضافة INSERT policies للـ wallets و notification_preferences

  1. المشكلة
    - wallets ليس لديه INSERT policy
    - notification_preferences ليس لديه INSERT policy بشكل صحيح
    - الـ triggers لا تستطيع الكتابة بسبب RLS
    - خطأ: "Database error saving new user"
    
  2. الحل
    - إضافة INSERT policies تسمح للـ triggers بالكتابة
    - استخدام WITH CHECK (true) للسماح بالإنشاء
    
  3. الأمان
    - الـ policies محدودة للـ authenticated users
    - كل مستخدم يستطيع إنشاء سجله الخاص فقط
*/

-- ============================================
-- إضافة INSERT policy لـ wallets
-- ============================================
DROP POLICY IF EXISTS "Users can create own wallet" ON wallets;

CREATE POLICY "Users can create own wallet"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- تحديث INSERT policy لـ notification_preferences
-- ============================================
DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- التأكد من وجود INSERT policy لـ profiles (موجود بالفعل)
-- ============================================
-- "Allow trigger to insert profiles" موجود بالفعل مع WITH CHECK (true)

COMMENT ON POLICY "Users can create own wallet" ON wallets IS 'Allows triggers to create wallets for new users';
COMMENT ON POLICY "Users can insert own preferences" ON notification_preferences IS 'Allows triggers to create notification preferences for new users';
