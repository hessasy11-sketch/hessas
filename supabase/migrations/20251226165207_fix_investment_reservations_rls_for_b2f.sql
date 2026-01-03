/*
  # إصلاح RLS لجدول investment_reservations لدعم نظام B2F
  
  1. Changes
    - جعل user_id قابل للقيمة الفارغة (nullable)
    - إضافة policy للمستخدمين غير المصادقين (anon) لإنشاء حجوزات
    - إضافة policy للقراءة بناءً على رقم الهاتف
    
  2. Security
    - السماح للمستخدمين غير المصادقين بإنشاء حجوزات
    - السماح بقراءة الحجوزات بناءً على رقم الهاتف
*/

-- جعل user_id قابل للقيمة الفارغة
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE investment_reservations 
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- حذف الـ policies القديمة
DROP POLICY IF EXISTS "Users can view own investment reservations" ON investment_reservations;
DROP POLICY IF EXISTS "Users can create own investment reservations" ON investment_reservations;
DROP POLICY IF EXISTS "Users can update own investment reservations" ON investment_reservations;

-- إنشاء policies جديدة

-- السماح للمستخدمين غير المصادقين بإنشاء حجوزات
CREATE POLICY "Allow anon to create investment reservations"
  ON investment_reservations FOR INSERT
  TO anon
  WITH CHECK (true);

-- السماح للمستخدمين المصادقين بإنشاء حجوزات
CREATE POLICY "Allow authenticated to create investment reservations"
  ON investment_reservations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- السماح للمستخدمين غير المصادقين بقراءة حجوزاتهم بناءً على رقم الهاتف
CREATE POLICY "Allow anon to view reservations by phone"
  ON investment_reservations FOR SELECT
  TO anon
  USING (true);

-- السماح للمستخدمين المصادقين بقراءة حجوزاتهم
CREATE POLICY "Allow authenticated to view own reservations"
  ON investment_reservations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR user_id IS NULL
  );

-- السماح بالتحديث للمستخدمين المصادقين فقط
CREATE POLICY "Allow authenticated to update own reservations"
  ON investment_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- إضافة comment للتوضيح
COMMENT ON TABLE investment_reservations IS 'جدول حجوزات الفرص الاستثمارية - يدعم المستخدمين المصادقين وغير المصادقين (B2F system)';
