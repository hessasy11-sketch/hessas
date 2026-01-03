/*
  # تحديث بطاقات لوحة التحكم الإدارية

  ## التعديلات المنفذة:
  
  ### 1. بطاقة المزادات العامة (public):
  - **قبل:** المزادات العامة 🌿
  - **بعد:** مزاد الشركات والمزارع 🏢
  - تغيير الاسم والوصف والأيقونة واللون
  
  ### 2. بطاقة الشركات والمزارع (b2b):
  - **قبل:** الشركات والمزارع 🏢 (زرقاء)
  - **بعد:** استثمار أشجار المزارع 🌴 (خضراء)
  - تغيير الاسم والوصف والأيقونة واللون
  
  ### 3. إخفاء البطاقات التالية:
  - ❌ المنصة الرسمية (official)
  - ❌ مزادات القروبات (groups)
  - ❌ المقتنيات النادرة (collectibles)
  
  ## ملاحظات:
  - البطاقات المخفية لن تظهر في لوحة التحكم ولكن بياناتها محفوظة
  - يمكن إعادة تفعيلها لاحقاً بتغيير is_active = true
  - البيانات التاريخية والمزادات المرتبطة بها محفوظة
*/

-- 1. تحديث بطاقة "المزادات العامة" إلى "مزاد الشركات والمزارع"
UPDATE dashboard_sections
SET 
  section_name = 'مزاد الشركات والمزارع',
  section_name_en = 'Companies and Farms Auction',
  description = 'منصة مخصصة لمزادات الشركات والمزارع الزراعية الكبيرة',
  icon = '🏢',
  color = '#F59E0B'
WHERE section_key = 'public';

-- 2. تحديث بطاقة "الشركات والمزارع" إلى "استثمار أشجار المزارع"
UPDATE dashboard_sections
SET 
  section_name = 'استثمار أشجار المزارع',
  section_name_en = 'Farm Trees Investment',
  description = 'قسم مخصص لاستثمار في أشجار المزارع والحصص الزراعية',
  icon = '🌴',
  color = '#10B981'
WHERE section_key = 'b2b';

-- 3. إخفاء بطاقة "المنصة الرسمية"
UPDATE dashboard_sections
SET is_active = false
WHERE section_key = 'official';

-- 4. إخفاء بطاقة "مزادات القروبات"
UPDATE dashboard_sections
SET is_active = false
WHERE section_key = 'groups';

-- 5. إخفاء بطاقة "المقتنيات النادرة"
UPDATE dashboard_sections
SET is_active = false
WHERE section_key = 'collectibles';

-- التحقق من النتائج
COMMENT ON TABLE dashboard_sections IS 'تم تحديث بطاقات لوحة التحكم: تغيير المزادات العامة والشركات والمزارع، وإخفاء 3 بطاقات (المنصة الرسمية، القروبات، المقتنيات)';
