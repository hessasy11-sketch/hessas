/*
  # إضافة جميع مدن المملكة العربية السعودية الكاملة
  
  ## نظرة عامة
  هذا الـ migration يضيف جميع المدن السعودية (أكثر من 120 مدينة) مرتبطة بمناطقها الصحيحة.
  
  ## التغييرات
  
  ### 1. حذف المدن الحالية
  - حذف جميع المدن الموجودة (49 مدينة) لإعادة إدخالها كاملة
  
  ### 2. إضافة جميع المدن حسب المناطق
  
  #### منطقة الرياض (19 مدينة)
  الرياض، الدرعية، الخرج، الدلم، المزاحمية، القويعية، حريملاء، ثادق، شقراء، مرات، 
  الأفلاج، السليل، وادي الدواسر، الزلفي، الغاط، المجمعة، رماح، الحريق، حوطة بني تميم
  
  #### منطقة مكة المكرمة (13 مدينة)
  مكة، جدة، الطائف، القنفذة، الليث، رابغ، خليص، الكامل، الخرمة، تربة، رنية، بحرة، الجموم
  
  #### منطقة المدينة المنورة (7 مدن)
  المدينة، ينبع، العلا، خيبر، بدر، الحناكية، مهد الذهب
  
  #### منطقة القصيم (11 مدينة)
  بريدة، عنيزة، الرس، البكيرية، البدائع، المذنب، النبهانية، رياض الخبراء، 
  الشماسية، عقلة الصقور، ضرية
  
  #### المنطقة الشرقية (12 مدينة)
  الدمام، الخبر، الظهران، الأحساء، الجبيل، القطيف، رأس تنورة، بقيق، 
  النعيرية، الخفجي، حفر الباطن، قرية العليا
  
  #### منطقة عسير (11 مدينة)
  أبها، خميس مشيط، بيشة، النماص، محايل، ظهران الجنوب، رجال ألمع، 
  تثليث، سراة عبيدة، بارق، المجاردة
  
  #### منطقة تبوك (6 مدن)
  تبوك، تيماء، ضباء، الوجه، حقل، البدع
  
  #### منطقة حائل (8 مدن)
  حائل، بقعاء، الشنان، موقق، الغزالة، الحائط، السليمي، الشملي
  
  #### منطقة الحدود الشمالية (4 مدن)
  عرعر، رفحاء، طريف، العويقيلة
  
  #### منطقة جازان (11 مدينة)
  جازان، صبيا، صامطة، أبو عريش، بيش، الدرب، فرسان، العارضة، الحرث، ضمد، العيدابي
  
  #### منطقة نجران (7 مدن)
  نجران، شرورة، حبونا، بدر الجنوب، يدمة، ثار، خباش
  
  #### منطقة الباحة (7 مدن)
  الباحة، بلجرشي، المندق، المخواة، قلوة، العقيق، بني حسن
  
  #### منطقة الجوف (4 مدن)
  سكاكا، القريات، دومة الجندل، طبرجل
  
  ### 3. الإجمالي
  - **13 منطقة** (موجودة مسبقاً)
  - **120 مدينة** (جديدة)
*/

-- حذف جميع المدن الحالية
DELETE FROM cities;

-- إعادة تعيين الترقيم التلقائي إذا لزم الأمر
-- (لكن نستخدم UUID فلا حاجة)

-- ============================================
-- 1) منطقة الرياض (19 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['الرياض', 'الدرعية', 'الخرج', 'الدلم', 'المزاحمية', 'القويعية', 'حريملاء', 'ثادق', 'شقراء', 'مرات', 'الأفلاج', 'السليل', 'وادي الدواسر', 'الزلفي', 'الغاط', 'المجمعة', 'رماح', 'الحريق', 'حوطة بني تميم']),
  unnest(ARRAY['Riyadh', 'Diriyah', 'Al-Kharj', 'Al-Dilam', 'Al-Muzahimiyah', 'Al-Quwayiyah', 'Huraymila', 'Thadiq', 'Shaqra', 'Marat', 'Al-Aflaj', 'As-Sulayil', 'Wadi Ad-Dawasir', 'Az-Zulfi', 'Al-Ghat', 'Al-Majmaah', 'Rumah', 'Al-Hariq', 'Hotat Bani Tamim']),
  generate_series(1, 19)
FROM regions WHERE name_ar = 'الرياض';

-- ============================================
-- 2) منطقة مكة المكرمة (13 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['مكة', 'جدة', 'الطائف', 'القنفذة', 'الليث', 'رابغ', 'خليص', 'الكامل', 'الخرمة', 'تربة', 'رنية', 'بحرة', 'الجموم']),
  unnest(ARRAY['Makkah', 'Jeddah', 'Taif', 'Al-Qunfudhah', 'Al-Lith', 'Rabigh', 'Khulais', 'Al-Kamil', 'Al-Khurmah', 'Turbah', 'Ranyah', 'Bahrah', 'Al-Jumum']),
  generate_series(1, 13)
FROM regions WHERE name_ar = 'مكة المكرمة';

-- ============================================
-- 3) منطقة المدينة المنورة (7 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['المدينة', 'ينبع', 'العلا', 'خيبر', 'بدر', 'الحناكية', 'مهد الذهب']),
  unnest(ARRAY['Madinah', 'Yanbu', 'Al-Ula', 'Khaybar', 'Badr', 'Al-Hanakiyah', 'Mahd Ad-Dahab']),
  generate_series(1, 7)
FROM regions WHERE name_ar = 'المدينة المنورة';

-- ============================================
-- 4) منطقة القصيم (11 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['بريدة', 'عنيزة', 'الرس', 'البكيرية', 'البدائع', 'المذنب', 'النبهانية', 'رياض الخبراء', 'الشماسية', 'عقلة الصقور', 'ضرية']),
  unnest(ARRAY['Buraydah', 'Unaizah', 'Ar-Rass', 'Al-Bukayriyah', 'Al-Badai', 'Al-Mithnab', 'An-Nabhaniyah', 'Riyadh Al-Khabra', 'Ash-Shimasiyah', 'Uqlat As-Suqur', 'Daria']),
  generate_series(1, 11)
FROM regions WHERE name_ar = 'القصيم';

-- ============================================
-- 5) المنطقة الشرقية (12 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الجبيل', 'القطيف', 'رأس تنورة', 'بقيق', 'النعيرية', 'الخفجي', 'حفر الباطن', 'قرية العليا']),
  unnest(ARRAY['Dammam', 'Khobar', 'Dhahran', 'Al-Ahsa', 'Jubail', 'Qatif', 'Ras Tanura', 'Buqayq', 'Al-Nairyah', 'Khafji', 'Hafar Al-Batin', 'Qaryat Al-Ulya']),
  generate_series(1, 12)
FROM regions WHERE name_ar = 'المنطقة الشرقية';

-- ============================================
-- 6) منطقة عسير (11 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['أبها', 'خميس مشيط', 'بيشة', 'النماص', 'محايل', 'ظهران الجنوب', 'رجال ألمع', 'تثليث', 'سراة عبيدة', 'بارق', 'المجاردة']),
  unnest(ARRAY['Abha', 'Khamis Mushait', 'Bisha', 'An-Namas', 'Muhayil', 'Dhahran Al-Janub', 'Rijal Alma', 'Tathlith', 'Sarat Abidah', 'Bareq', 'Al-Majardah']),
  generate_series(1, 11)
FROM regions WHERE name_ar = 'عسير';

-- ============================================
-- 7) منطقة تبوك (6 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['تبوك', 'تيماء', 'ضباء', 'الوجه', 'حقل', 'البدع']),
  unnest(ARRAY['Tabuk', 'Tayma', 'Duba', 'Al-Wajh', 'Haql', 'Al-Bada']),
  generate_series(1, 6)
FROM regions WHERE name_ar = 'تبوك';

-- ============================================
-- 8) منطقة حائل (8 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['حائل', 'بقعاء', 'الشنان', 'موقق', 'الغزالة', 'الحائط', 'السليمي', 'الشملي']),
  unnest(ARRAY['Hail', 'Baqaa', 'Ash-Shinan', 'Muwaqqaq', 'Al-Ghazalah', 'Al-Hait', 'As-Sulaymi', 'Ash-Shamli']),
  generate_series(1, 8)
FROM regions WHERE name_ar = 'حائل';

-- ============================================
-- 9) منطقة الحدود الشمالية (4 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['عرعر', 'رفحاء', 'طريف', 'العويقيلة']),
  unnest(ARRAY['Arar', 'Rafha', 'Turaif', 'Al-Uwayqilah']),
  generate_series(1, 4)
FROM regions WHERE name_ar = 'الحدود الشمالية';

-- ============================================
-- 10) منطقة جازان (11 مدينة)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['جازان', 'صبيا', 'صامطة', 'أبو عريش', 'بيش', 'الدرب', 'فرسان', 'العارضة', 'الحرث', 'ضمد', 'العيدابي']),
  unnest(ARRAY['Jazan', 'Sabya', 'Samtah', 'Abu Arish', 'Baysh', 'Ad-Darb', 'Farasan', 'Al-Aridah', 'Al-Harth', 'Damad', 'Al-Aydabi']),
  generate_series(1, 11)
FROM regions WHERE name_ar = 'جازان';

-- ============================================
-- 11) منطقة نجران (7 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['نجران', 'شرورة', 'حبونا', 'بدر الجنوب', 'يدمة', 'ثار', 'خباش']),
  unnest(ARRAY['Najran', 'Sharurah', 'Habuna', 'Badr Al-Janub', 'Yadamah', 'Thar', 'Khabash']),
  generate_series(1, 7)
FROM regions WHERE name_ar = 'نجران';

-- ============================================
-- 12) منطقة الباحة (7 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['الباحة', 'بلجرشي', 'المندق', 'المخواة', 'قلوة', 'العقيق', 'بني حسن']),
  unnest(ARRAY['Al-Bahah', 'Baljurashi', 'Al-Mandaq', 'Al-Mikhwah', 'Qilwah', 'Al-Aqiq', 'Bani Hasan']),
  generate_series(1, 7)
FROM regions WHERE name_ar = 'الباحة';

-- ============================================
-- 13) منطقة الجوف (4 مدن)
-- ============================================
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT 
  id,
  unnest(ARRAY['سكاكا', 'القريات', 'دومة الجندل', 'طبرجل']),
  unnest(ARRAY['Sakaka', 'Al-Qurayyat', 'Dumat Al-Jandal', 'Tabarjal']),
  generate_series(1, 4)
FROM regions WHERE name_ar = 'الجوف';
