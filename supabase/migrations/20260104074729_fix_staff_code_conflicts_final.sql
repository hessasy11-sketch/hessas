/*
  # إصلاح تضارب أرقام الموظفين - نهائي

  1. المشكلة
    - البيانات القديمة تحتوي على staff_code بصيغة بسيطة: "001", "1", "2", etc.
    - النظام الجديد يولد staff_code بصيغة: "A-00001-UUID"
    - هذا يسبب تضارب عند محاولة إدخال موظف جديد

  2. الحل
    - تحديث جميع staff_code القديمة إلى الصيغة الجديدة
    - إعادة ضبط الـ sequence لتبدأ من رقم مناسب
    - ضمان عدم وجود تكرارات
*/

-- الخطوة 1: تحديث جميع staff_code القديمة التي لا تتبع الصيغة الجديدة
UPDATE platform_staff
SET staff_code = generate_unique_staff_code()
WHERE staff_code NOT LIKE 'A-%'
   OR staff_code IS NULL;

-- الخطوة 2: إعادة ضبط الـ sequence لتبدأ من رقم كبير
-- هذا يضمن عدم التعارض مع أي بيانات مستقبلية
SELECT setval('platform_staff_code_seq', 1000, false);

-- الخطوة 3: التحقق من عدم وجود تكرارات
DO $$
DECLARE
  v_duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT staff_code, COUNT(*) as cnt
    FROM platform_staff
    WHERE staff_code IS NOT NULL
    GROUP BY staff_code
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate staff codes - fixing...', v_duplicate_count;
    
    -- إصلاح التكرارات إن وجدت
    UPDATE platform_staff p1
    SET staff_code = generate_unique_staff_code()
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY staff_code ORDER BY created_at) as rn
        FROM platform_staff
        WHERE staff_code IS NOT NULL
      ) sub
      WHERE rn > 1
    );
  END IF;
END $$;
