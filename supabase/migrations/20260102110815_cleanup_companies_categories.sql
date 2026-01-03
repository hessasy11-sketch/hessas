/*
  # تنظيف فئات قسم الشركات

  ## الوصف
  إزالة الفئات المكررة وتنظيم sub_type

  ## التغييرات
  1. حذف الفئات التي sub_type = null من قسم companies (لأنها مكررة)
  2. الإبقاء فقط على فئات offer و request

  ## الهدف
  ترتيب الفئات بشكل نظيف في قسم companies
*/

-- حذف الفئات التي sub_type = null من قسم companies
-- لأنها مكررة مع فئات offer و request
DELETE FROM categories 
WHERE section = 'companies' 
  AND sub_type IS NULL;
