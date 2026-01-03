/*
  # إضافة صلاحية تحديث الباقات للمدراء

  1. التغييرات
    - إضافة سياسة UPDATE للمدراء فقط
    - السماح بتحديث جميع حقول الباقات
    
  2. الأمان
    - فقط المدراء (user_type = 'admin') يمكنهم التحديث
    - باقي المستخدمين يمكنهم القراءة فقط
*/

-- إضافة سياسة UPDATE للمدراء فقط
CREATE POLICY "Admins can update subscription plans"
ON subscription_plans
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- إضافة سياسة SELECT للمدراء لرؤية جميع الباقات (حتى غير النشطة)
CREATE POLICY "Admins can view all subscription plans"
ON subscription_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
