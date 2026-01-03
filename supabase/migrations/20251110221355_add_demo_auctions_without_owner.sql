/*
  # إضافة مزادات تجريبية

  ## التغييرات:
  1. تعديل جدول auctions ليجعل owner_id اختياري مؤقتاً
  2. إضافة 15 مزاد تجريبي بدون owner
  3. إعادة owner_id للـ NOT NULL بعد الإضافة

  ## البيانات:
  - 5 مزادات للمزادات العامة
  - 4 مزادات للشركات
  - 2 مزادات رسمية
  - 2 مزادات قروبات
  - 2 مقتنيات نادرة
*/

-- تعديل مؤقت للجدول
ALTER TABLE auctions ALTER COLUMN owner_id DROP NOT NULL;

-- المزادات العامة (public)
INSERT INTO auctions (section, category_id, title, description, starting_price, current_price, images, status, starts_at, ends_at, location)
VALUES
  ('public', (SELECT id FROM categories WHERE section = 'public' AND name_ar = 'نخيل' LIMIT 1), 
   'نخيل بلح فاخر للبيع', 'نخيل بلح عمر 10 سنوات، منتج وبحالة ممتازة', 5000, 7500, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '3 days', 'الرياض'),
  
  ('public', (SELECT id FROM categories WHERE section = 'public' AND name_ar = 'معدات زراعية' LIMIT 1), 
   'جرار زراعي مستعمل', 'جرار زراعي موديل 2020، صيانة دورية كاملة', 45000, 52000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '5 days', 'القصيم'),
  
  ('public', (SELECT id FROM categories WHERE section = 'public' AND name_ar = 'أشجار زيتون' LIMIT 1), 
   'أشجار زيتون مثمرة', '20 شجرة زيتون عمر 8 سنوات مثمرة', 8000, 10500, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '2 days', 'الجوف'),
  
  ('public', (SELECT id FROM categories WHERE section = 'public' AND name_ar = 'بذور' LIMIT 1), 
   'بذور برسيم مستورد', 'بذور برسيم أمريكي عالية الجودة - 100 كجم', 1500, 1800, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '1 day', 'حائل'),
  
  ('public', (SELECT id FROM categories WHERE section = 'public' AND name_ar = 'خدمات زراعية' LIMIT 1), 
   'خدمة تقليم وتنظيف مزارع', 'خدمة شاملة لتقليم الأشجار وتنظيف المزارع', 3000, 3500, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '4 days', 'الخرج');

-- مزادات الشركات (companies)
INSERT INTO auctions (section, category_id, sub_type, title, description, starting_price, current_price, images, status, starts_at, ends_at, location)
VALUES
  ('companies', (SELECT id FROM categories WHERE section = 'companies' AND sub_type = 'request' AND name_ar = 'نخيل' LIMIT 1), 'request',
   'مطلوب 100 نخلة بلح', 'شركة زراعية تطلب 100 نخلة بلح منتجة', 200000, 220000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '7 days', 'الأحساء'),
  
  ('companies', (SELECT id FROM categories WHERE section = 'companies' AND sub_type = 'request' AND name_ar = 'معدات زراعية' LIMIT 1), 'request',
   'مطلوب نظام ري حديث', 'شركة تطلب نظام ري حديث لمزرعة 50 هكتار', 85000, 95000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '6 days', 'تبوك'),
  
  ('companies', (SELECT id FROM categories WHERE section = 'companies' AND sub_type = 'offer' AND name_ar = 'أسمدة' LIMIT 1), 'offer',
   'عرض: أسمدة عضوية 10 طن', 'شركة تعرض 10 طن أسمدة عضوية معتمدة', 25000, 28000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '5 days', 'الدمام'),
  
  ('companies', (SELECT id FROM categories WHERE section = 'companies' AND sub_type = 'offer' AND name_ar = 'بذور' LIMIT 1), 'offer',
   'عرض: بذور قمح محسنة', 'بذور قمح عالية الإنتاجية - 5000 كجم', 35000, 38000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '4 days', 'حائل');

-- المزادات الرسمية (official)
INSERT INTO auctions (section, category_id, title, description, starting_price, current_price, images, status, starts_at, ends_at, location)
VALUES
  ('official', (SELECT id FROM categories WHERE section = 'official' AND name_ar = 'تملك النخيل' LIMIT 1),
   'مزاد رسمي: مزرعة نخيل 100 دونم', 'مزرعة نخيل كاملة بموقع استراتيجي', 2500000, 2750000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '15 days', 'الأحساء'),
  
  ('official', (SELECT id FROM categories WHERE section = 'official' AND name_ar = 'تملك العقارات الزراعية' LIMIT 1),
   'مزاد رسمي: أرض زراعية 50 هكتار', 'أرض زراعية مع بئر ارتوازي وشبكة ري', 1800000, 1950000, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '20 days', 'القصيم');

-- مزادات القروبات (groups)
INSERT INTO auctions (section, category_id, title, description, starting_price, current_price, images, status, starts_at, ends_at, location)
VALUES
  ('groups', (SELECT id FROM categories WHERE section = 'groups' AND name_ar = 'نخيل' LIMIT 1),
   'نخيل سكري للبيع - قروب المزارعين', '15 نخلة سكري منتجة', 12000, 14500, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '2 days', 'القصيم'),
  
  ('groups', (SELECT id FROM categories WHERE section = 'groups' AND name_ar = 'معدات زراعية' LIMIT 1),
   'مضخة ماء زراعية - قروب الري', 'مضخة ماء ديزل 50 حصان', 8000, 9200, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '3 days', 'الرياض');

-- المقتنيات النادرة (collectibles)
INSERT INTO auctions (section, category_id, title, description, starting_price, current_price, images, status, starts_at, ends_at, location)
VALUES
  ('collectibles', (SELECT id FROM categories WHERE section = 'collectibles' AND name_ar = 'أدوات ومعدات قديمة' LIMIT 1),
   'محراث خشبي تراثي', 'محراث خشبي أصلي عمره أكثر من 100 سنة', 3500, 4200, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '10 days', 'عنيزة'),
  
  ('collectibles', (SELECT id FROM categories WHERE section = 'collectibles' AND name_ar = 'بذور نادرة' LIMIT 1),
   'بذور نخيل نادرة', 'بذور نخيل من نوع نادر ومهدد بالانقراض', 2500, 3100, ARRAY[]::text[], 'active', NOW(), NOW() + INTERVAL '12 days', 'المدينة المنورة');
