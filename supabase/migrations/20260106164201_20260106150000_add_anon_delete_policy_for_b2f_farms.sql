/*
  # إضافة صلاحية حذف المزارع للـ Anonymous

  1. التغييرات
    - إضافة سياسة حذف للمزارع تسمح بالحذف للـ anonymous
    - هذا يسمح للموظفين بحذف المزارع من لوحة التحكم
*/

-- إضافة سياسة حذف جديدة للـ anonymous
CREATE POLICY "Allow anon delete farms"
  ON b2f_farms
  FOR DELETE
  TO anon
  USING (true);
