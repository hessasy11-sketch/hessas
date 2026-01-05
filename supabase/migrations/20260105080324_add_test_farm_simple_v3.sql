/*
  # إنشاء مزرعة تجريبية بسيطة لاختبار النظام

  1. البيانات
    - مزرعة تجريبية
    - عقد واحد (سيُنشئ operational farm تلقائياً)

  2. للوصول
    - URL: /farms/22222222-2222-2222-2222-222222222222
*/

-- 1. إنشاء المزرعة التجريبية
INSERT INTO b2f_farms (
  id,
  name,
  location,
  city,
  total_trees_available,
  description,
  is_active,
  operational_status
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'مزرعة النخيل التجريبية',
  'طريق الملك عبدالله',
  'الرياض',
  500,
  'مزرعة تجريبية لاختبار نظام Teams Builder والـ Hard Gate',
  true,
  'setup'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();

-- 2. إنشاء عقد تجريبي (سيُنشئ operational farm تلقائياً بالـ trigger)
INSERT INTO b2f_contracts (
  id,
  farm_id,
  contract_number,
  investor_phone,
  trees_count,
  total_amount,
  start_date,
  end_date,
  duration_years,
  status
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'CONT-TEST-001',
  '+966500000999',
  10,
  12000.00,
  now(),
  now() + interval '5 years',
  5,
  'active'
)
ON CONFLICT (id) DO NOTHING;