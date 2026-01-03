/*
  # إنشاء تصنيفات قسم مزادات المنصة الرسمية

  1. التصنيفات الجديدة
    - مزادات تملك النخيل 🌴
    - مزادات تملك أشجار الزيتون 🫒
    - مزادات تملك العقارات الزراعية 🏡
    - مزادات أخرى 🌟
  
  2. التصميم
    - ألوان ذهبية فاخرة (#d4af37, #c5a572, #b8860b, #ffd700)
    - كل تصنيف له لون ذهبي مختلف لإضافة لمسة فاخرة
    - ترتيب منطقي حسب الأهمية
  
  3. الأمان
    - جميع التصنيفات تحت قسم 'platform'
    - sub_type = 'both' (متاحة للجميع)
    - يمكن إدارتها من لوحة التحكم الإدارية
*/

-- حذف التصنيفات القديمة لقسم platform إن وجدت
DELETE FROM auction_categories WHERE section = 'platform';

-- إدراج تصنيفات مزادات المنصة الرسمية
INSERT INTO auction_categories (name_ar, icon, color, section, sub_type, sort_order)
VALUES
  ('مزادات تملك النخيل', '🌴', '#d4af37', 'platform', 'both', 1),
  ('مزادات تملك أشجار الزيتون', '🫒', '#c5a572', 'platform', 'both', 2),
  ('مزادات تملك العقارات الزراعية', '🏡', '#b8860b', 'platform', 'both', 3),
  ('مزادات أخرى', '🌟', '#ffd700', 'platform', 'both', 4);

-- إضافة تعليق توضيحي
COMMENT ON COLUMN auction_categories.section IS 'القسم: public (عام)، companies (شركات)، platform (المنصة الرسمية)، groups (قروبات)';
