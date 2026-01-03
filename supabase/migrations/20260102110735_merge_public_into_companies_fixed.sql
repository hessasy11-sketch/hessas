/*
  # دمج قسم المزارع في قسم الشركات - إصدار محسّن

  ## الوصف
  نقل جميع فئات ومزادات قسم المزارع (public) إلى قسم الشركات (companies)

  ## التغييرات
  1. تحديث جميع المزادات من public إلى companies
  2. نقل جميع الفئات من public إلى companies (مع تجنب التكرار)
  3. تحديث أو حذف البيانات المرتبطة في dashboard_stats
  4. حذف فئات public القديمة بعد التأكد من النقل

  ## الهدف
  توحيد قسم واحد لجميع المزادات (الشركات والمزارع معاً)
*/

-- 1. تحديث جميع المزادات من public إلى companies
UPDATE auctions 
SET section = 'companies' 
WHERE section = 'public';

-- 2. التأكد من وجود الفئات في قسم companies (إضافة ما ينقص فقط)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT DISTINCT name_ar, icon, sort_order, sub_type, is_active
    FROM categories
    WHERE section = 'public'
  LOOP
    -- إضافة الفئة إلى companies إذا لم تكن موجودة
    INSERT INTO categories (section, sub_type, name_ar, icon, sort_order, is_active)
    SELECT 
      'companies',
      rec.sub_type,
      rec.name_ar,
      rec.icon,
      rec.sort_order,
      rec.is_active
    WHERE NOT EXISTS (
      SELECT 1 FROM categories 
      WHERE section = 'companies' 
        AND name_ar = rec.name_ar 
        AND COALESCE(sub_type, '') = COALESCE(rec.sub_type, '')
    );
  END LOOP;
END $$;

-- 3. حذف فئات public بعد التأكد من نقلها
DELETE FROM categories WHERE section = 'public';

-- 4. تحديث أو حذف البيانات في dashboard_stats إذا كان الجدول موجوداً
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_stats') THEN
    -- نقل إحصائيات public إلى companies
    UPDATE dashboard_stats 
    SET section_key = 'companies' 
    WHERE section_key = 'public';
  END IF;
END $$;

-- 5. تحديث dashboard_sections إذا كان الجدول موجوداً
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_sections') THEN
    -- تحديث قسم companies
    UPDATE dashboard_sections
    SET section_name = 'مزاد الشركات و المزارع',
        description = 'قسم موحد لجميع مزادات الشركات والمزارع'
    WHERE section_key = 'companies';
    
    -- حذف قسم public
    DELETE FROM dashboard_sections WHERE section_key = 'public';
  END IF;
END $$;
