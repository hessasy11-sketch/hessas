/*
  # Test Data for Phase 2: Task Proofs System

  Add test tasks that require proof for testing the proof upload/review system
*/

-- Add 3 test tasks that require proof
DO $$
DECLARE
  v_test_farm_id uuid;
BEGIN
  -- Get a test farm
  SELECT id INTO v_test_farm_id
  FROM b2f_farms
  LIMIT 1;

  IF v_test_farm_id IS NOT NULL THEN
    -- Task 1: Irrigation (requires proof, pending)
    INSERT INTO farm_tasks (
      farm_id,
      title,
      description,
      type,
      status,
      priority,
      requires_proof,
      assigned_to_name,
      created_by_name
    )
    VALUES (
      v_test_farm_id,
      'ري القطاع الشمالي من المزرعة',
      'يجب ري جميع الأشجار في القطاع الشمالي وتوثيق العملية بالصور',
      'irrigation',
      'pending',
      'high',
      true,
      'أحمد محمد - عامل',
      'مدير المزرعة'
    );

    -- Task 2: Fertilization (requires proof, in_progress)
    INSERT INTO farm_tasks (
      farm_id,
      title,
      description,
      type,
      status,
      priority,
      requires_proof,
      assigned_to_name,
      created_by_name,
      started_at
    )
    VALUES (
      v_test_farm_id,
      'تسميد الأشجار - القطاع الجنوبي',
      'وضع السماد العضوي وتوثيق الكمية المستخدمة',
      'fertilization',
      'in_progress',
      'medium',
      true,
      'محمد علي - عامل',
      'مدير المزرعة',
      now() - interval '2 hours'
    );

    -- Task 3: Inspection (requires proof, submitted - for testing review)
    INSERT INTO farm_tasks (
      farm_id,
      title,
      description,
      type,
      status,
      priority,
      requires_proof,
      proof_notes,
      assigned_to_name,
      created_by_name,
      started_at,
      submitted_at
    )
    VALUES (
      v_test_farm_id,
      'فحص حالة الأشجار - القطاع الغربي',
      'فحص شامل لجميع الأشجار والتأكد من سلامتها',
      'inspection',
      'submitted',
      'high',
      true,
      'تم الفحص بالكامل، جميع الأشجار بحالة جيدة',
      'خالد أحمد - فني',
      'مدير المزرعة',
      now() - interval '3 hours',
      now() - interval '30 minutes'
    );

    RAISE NOTICE 'تم إضافة 3 مهام تجريبية تتطلب إثبات';
  END IF;
END $$;