-- إضافة بطاقة لوحة تحكم مدير المزرعة في البوابة
-- يتم تشغيله لمرة واحدة فقط

-- التحقق من وجود البطاقة أولاً
DO $$
BEGIN
  -- إذا لم تكن موجودة، أضفها
  IF NOT EXISTS (
    SELECT 1 FROM gateway_cards WHERE card_key = 'farm_manager_dashboard'
  ) THEN
    INSERT INTO gateway_cards (
      card_key,
      title_ar,
      title_en,
      description_ar,
      description_en,
      icon_name,
      gradient_from,
      gradient_to,
      route,
      min_role,
      display_order
    ) VALUES (
      'farm_manager_dashboard',
      'لوحة تحكم مدير المزرعة',
      'Farm Manager Dashboard',
      'إدارة كاملة للمزرعة: الفريق، المهام، المصروفات، والعمليات اليومية',
      'Complete farm management: team, tasks, expenses, and daily operations',
      'LayoutDashboard',
      '#10B981',
      '#059669',
      '/admin/farm-manager-dashboard',
      'farm_manager',
      60
    );

    RAISE NOTICE 'تم إضافة بطاقة لوحة تحكم مدير المزرعة بنجاح';
  ELSE
    RAISE NOTICE 'بطاقة لوحة تحكم مدير المزرعة موجودة مسبقاً';
  END IF;
END $$;

-- التحقق من النتيجة
SELECT
  card_key,
  title_ar,
  route,
  min_role,
  display_order
FROM gateway_cards
WHERE card_key = 'farm_manager_dashboard';
