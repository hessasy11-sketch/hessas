/*
  # إصلاح سياسة الإدخال لجدول حجوزات الاستثمار

  1. المشكلة
    - السياسة الحالية لا تسمح بإدخال البيانات بشكل صحيح
    
  2. الحل
    - حذف السياسات القديمة
    - إنشاء سياسات جديدة أكثر شمولاً
    - السماح للضيوف والمستخدمين المسجلين بإنشاء حجوزات

  3. السياسات الجديدة
    - INSERT: السماح للجميع (anon + authenticated)
    - SELECT: السماح للجميع
    - UPDATE: للمستخدمين المصرح لهم فقط
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow anon to insert reservations" ON investment_reservations;
DROP POLICY IF EXISTS "Allow anon to read reservations by phone" ON investment_reservations;
DROP POLICY IF EXISTS "Allow authenticated users to read all reservations" ON investment_reservations;
DROP POLICY IF EXISTS "Allow authenticated users to update reservations" ON investment_reservations;

-- سياسة الإدخال: السماح للجميع بإنشاء حجوزات
CREATE POLICY "Anyone can create reservations"
  ON investment_reservations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- سياسة القراءة: السماح للجميع بقراءة الحجوزات
CREATE POLICY "Anyone can read reservations"
  ON investment_reservations
  FOR SELECT
  TO public
  USING (true);

-- سياسة التحديث: فقط المستخدمين المصرح لهم
CREATE POLICY "Authenticated users can update reservations"
  ON investment_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف: فقط المستخدمين المصرح لهم
CREATE POLICY "Authenticated users can delete reservations"
  ON investment_reservations
  FOR DELETE
  TO authenticated
  USING (true);
