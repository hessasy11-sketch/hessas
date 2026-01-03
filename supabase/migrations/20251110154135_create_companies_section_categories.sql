/*
  # إنشاء تصنيفات قسم الشركات والمزارع

  1. التصنيفات الجديدة
    - نسخ جميع التصنيفات من القسم العام إلى قسم الشركات
    - جميع التصنيفات ستكون من نوع 'both' (تظهر في الطلبات والعروض)
  
  2. ملاحظات
    - يمكن للمدير لاحقاً تغيير sub_type لأي تصنيف إلى request أو offer
    - هذا يعطي مرونة في التحكم بظهور التصنيفات
*/

-- إنشاء تصنيفات قسم الشركات بنفس التصنيفات الموجودة في القسم العام
INSERT INTO auction_categories (name_ar, icon, color, section, sort_order, sub_type)
SELECT 
  name_ar,
  icon,
  color,
  'companies' as section,
  sort_order,
  'both' as sub_type
FROM auction_categories
WHERE section = 'public'
ON CONFLICT DO NOTHING;

-- التأكد من أن جميع التصنيفات في القسم العام لها sub_type = 'both'
UPDATE auction_categories
SET sub_type = 'both'
WHERE section = 'public' AND (sub_type IS NULL OR sub_type != 'both');
