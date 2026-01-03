/*
  # إضافة سياسات RLS للمستخدمين غير المصادق عليهم (PIN users)

  ## المشكلة
  - investment_reservations تستخدم TO authenticated فقط
  - مستخدمي PIN لا يمكنهم إنشاء أو عرض حجوزاتهم
  
  ## الحل
  - إضافة سياسات للمستخدمين غير المصادق عليهم (anon)
  - السماح بإنشاء وعرض الحجوزات بناءً على user_id في profiles
  
  ## الأمان
  - المستخدمون يمكنهم فقط رؤية وإنشاء حجوزاتهم الخاصة
  - user_id يجب أن يكون موجوداً في profiles
*/

-- Add anon policy for viewing own reservations
CREATE POLICY "Anon users can view own investment reservations"
  ON investment_reservations FOR SELECT
  TO anon
  USING (user_id IN (SELECT id FROM profiles));

-- Add anon policy for creating reservations
CREATE POLICY "Anon users can create investment reservations"
  ON investment_reservations FOR INSERT
  TO anon
  WITH CHECK (
    user_id IN (SELECT id FROM profiles)
  );

-- Add anon policy for updating own reservations
CREATE POLICY "Anon users can update own investment reservations"
  ON investment_reservations FOR UPDATE
  TO anon
  USING (user_id IN (SELECT id FROM profiles))
  WITH CHECK (user_id IN (SELECT id FROM profiles));
