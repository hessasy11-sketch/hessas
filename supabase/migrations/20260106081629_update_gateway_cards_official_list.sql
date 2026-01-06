/*
  # تحديث بطاقات بوابة التاج - القائمة الرسمية

  ## التحديثات
  - حذف البطاقات القديمة
  - إضافة 11 بطاقة رسمية مع المسارات الصحيحة
  - تحديث الأيقونات والألوان والأوصاف
  - ترتيب البطاقات حسب الأولوية

  ## البطاقات الجديدة
  1. غرفة القيادة العليا (GM Only)
  2. غرفة استثمار أشجار المزارع (B2F Ops)
  3. غرفة مزاد الشركات (B2B Ops)
  4. قيادة المزارع (Farm Command)
  5. لوحة المزرعة (Farm Workspace)
  6. عملي اليوم (My Work)
  7. المالية والمحاسبة
  8. التسويق
  9. الشركاء وكبار المستثمرين
  10. إدارة الموظفين والصلاحيات
  11. إعدادات المنصة
*/

-- حذف البطاقات القديمة
TRUNCATE TABLE gateway_cards CASCADE;

-- إضافة البطاقات الرسمية
INSERT INTO gateway_cards (
  card_key,
  title_ar,
  title_en,
  description_ar,
  description_en,
  icon,
  color,
  gradient_from,
  gradient_to,
  route_path,
  display_order,
  is_active,
  required_role,
  required_department
) VALUES
-- 1. غرفة القيادة العليا (GM Only)
(
  'executive_command',
  'غرفة القيادة العليا',
  'Executive Command Room',
  'نظرة شاملة + قرارات + سجل قيادي + تحكم كامل',
  'Complete overview, decisions, executive log, and full control',
  'Crown',
  'purple',
  'purple-600',
  'indigo-700',
  '/admin/operations-room/global',
  1,
  true,
  'general_manager',
  NULL
),

-- 2. غرفة استثمار أشجار المزارع (B2F Ops)
(
  'b2f_operations_room',
  'غرفة استثمار أشجار المزارع',
  'B2F Operations Room',
  'إدارة فرص الاستثمار والمستثمرين والعمليات التشغيلية',
  'Manage investment opportunities, investors, and operations',
  'Sprout',
  'green',
  'green-500',
  'emerald-600',
  '/admin/operations-room/b2f',
  2,
  true,
  NULL,
  NULL
),

-- 3. غرفة مزاد الشركات (B2B Ops)
(
  'b2b_operations_room',
  'غرفة مزاد الشركات',
  'B2B Auctions Operations',
  'إدارة المزادات بين الشركات والإشراف على العمليات',
  'Manage B2B auctions and supervise operations',
  'Gavel',
  'blue',
  'blue-500',
  'cyan-600',
  '/admin/operations-room/b2b',
  3,
  true,
  NULL,
  NULL
),

-- 4. قيادة المزارع (Farm Command)
(
  'farm_command',
  'قيادة المزارع',
  'Farm Command Center',
  'قيادة شاملة للمزارع + فرقها + تشغيلها',
  'Complete command of farms, teams, and operations',
  'Tractor',
  'amber',
  'amber-500',
  'orange-600',
  '/admin/b2f/farm-command',
  4,
  true,
  NULL,
  NULL
),

-- 5. لوحة المزرعة (Farm Workspace) - ديناميكي
(
  'farm_workspace',
  'لوحة المزرعة',
  'Farm Workspace',
  'لوحة العمل الخاصة بمزرعة محددة (حسب التعيين)',
  'Dedicated workspace for assigned farm',
  'Leaf',
  'lime',
  'lime-500',
  'green-600',
  '/admin/b2f/farms',
  5,
  true,
  NULL,
  NULL
),

-- 6. عملي اليوم (My Work) - Default Landing
(
  'my_work',
  'عملي اليوم',
  'My Work',
  'مساحة العمل اليومية - المهام والإشعارات والتحديثات',
  'Daily workspace - tasks, notifications, and updates',
  'Briefcase',
  'slate',
  'slate-500',
  'gray-600',
  '/admin/my-work',
  6,
  true,
  NULL,
  NULL
),

-- 7. المالية والمحاسبة
(
  'finance_center',
  'المالية والمحاسبة',
  'Finance & Accounting',
  'إدارة الحسابات والمدفوعات والتقارير المالية',
  'Manage accounts, payments, and financial reports',
  'DollarSign',
  'red',
  'red-500',
  'pink-600',
  '/admin/finance',
  7,
  true,
  NULL,
  NULL
),

-- 8. التسويق
(
  'marketing_center',
  'التسويق',
  'Marketing Center',
  'إدارة الحملات التسويقية والمحتوى والترويج',
  'Manage marketing campaigns, content, and promotion',
  'TrendingUp',
  'yellow',
  'yellow-500',
  'amber-600',
  '/admin/marketing',
  8,
  true,
  NULL,
  NULL
),

-- 9. الشركاء وكبار المستثمرين
(
  'partners_vip',
  'الشركاء وكبار المستثمرين',
  'Partners & VIP',
  'إدارة الشراكات والعلاقات مع كبار المستثمرين',
  'Manage partnerships and VIP investor relations',
  'Handshake',
  'indigo',
  'indigo-500',
  'purple-600',
  '/admin/partners',
  9,
  true,
  NULL,
  NULL
),

-- 10. إدارة الموظفين والصلاحيات (GM Only)
(
  'staff_permissions',
  'إدارة الموظفين والصلاحيات',
  'Staff & Permissions',
  'إنشاء وإدارة الموظفين ومنح الصلاحيات',
  'Create and manage staff and grant permissions',
  'Users',
  'teal',
  'teal-500',
  'cyan-600',
  '/admin/settings/staff',
  10,
  true,
  'general_manager',
  NULL
),

-- 11. إعدادات المنصة (GM Only)
(
  'platform_settings',
  'إعدادات المنصة',
  'Platform Settings',
  'إعدادات النظام والتخصيص والتحكم الكامل',
  'System settings, customization, and full control',
  'Settings',
  'gray',
  'gray-600',
  'slate-700',
  '/admin/settings',
  11,
  true,
  'general_manager',
  NULL
);

-- إضافة بيانات إضافية للبطاقات التي تحتاج معلومات خاصة
UPDATE gateway_cards
SET metadata = jsonb_build_object(
  'is_gm_only', true,
  'description', 'البطاقة الأقوى - تحكم كامل في المنصة'
)
WHERE card_key IN ('executive_command', 'staff_permissions', 'platform_settings');

UPDATE gateway_cards
SET metadata = jsonb_build_object(
  'is_default_landing', true,
  'available_to_all', true,
  'description', 'صفحة الهبوط الافتراضية لجميع الموظفين'
)
WHERE card_key = 'my_work';

UPDATE gateway_cards
SET metadata = jsonb_build_object(
  'is_dynamic', true,
  'requires_farm_assignment', true,
  'description', 'يتم عرضها فقط للموظفين المعينين على مزرعة محددة'
)
WHERE card_key = 'farm_workspace';

-- إنشاء دالة للحصول على بطاقات المستخدم مع معالجة البطاقات الديناميكية
CREATE OR REPLACE FUNCTION get_user_cards_with_farms(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_gm boolean;
  v_cards jsonb;
  v_user_farms jsonb;
BEGIN
  -- التحقق: هل المستخدم GM؟
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_user_id
    AND role = 'general_manager'
  ) INTO v_is_gm;

  -- الحصول على مزارع المستخدم
  SELECT jsonb_agg(jsonb_build_object(
    'farm_id', ft.farm_id,
    'farm_name', f.name_ar,
    'role', ft.role
  ))
  INTO v_user_farms
  FROM farm_team_members ft
  INNER JOIN b2f_farms f ON f.id = ft.farm_id
  WHERE ft.staff_id = p_user_id
  AND ft.status = 'active';

  -- إذا كان GM: إرجاع جميع البطاقات
  IF v_is_gm THEN
    SELECT jsonb_build_object(
      'cards', COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', gc.id,
          'card_key', gc.card_key,
          'title_ar', gc.title_ar,
          'title_en', gc.title_en,
          'description_ar', gc.description_ar,
          'description_en', gc.description_en,
          'icon', gc.icon,
          'color', gc.color,
          'gradient_from', gc.gradient_from,
          'gradient_to', gc.gradient_to,
          'route_path', gc.route_path,
          'display_order', gc.display_order,
          'access_level', 'full',
          'is_gm_access', true,
          'metadata', gc.metadata
        )
        ORDER BY gc.display_order
      ), '[]'::jsonb),
      'user_farms', COALESCE(v_user_farms, '[]'::jsonb)
    )
    INTO v_cards
    FROM gateway_cards gc
    WHERE gc.is_active = true;
  ELSE
    -- غير GM: إرجاع البطاقات المصرح بها + my_work
    SELECT jsonb_build_object(
      'cards', COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', gc.id,
          'card_key', gc.card_key,
          'title_ar', gc.title_ar,
          'title_en', gc.title_en,
          'description_ar', gc.description_ar,
          'description_en', gc.description_en,
          'icon', gc.icon,
          'color', gc.color,
          'gradient_from', gc.gradient_from,
          'gradient_to', gc.gradient_to,
          'route_path', gc.route_path,
          'display_order', gc.display_order,
          'access_level', ga.access_level,
          'is_gm_access', false,
          'metadata', gc.metadata
        )
        ORDER BY gc.display_order
      ), '[]'::jsonb),
      'user_farms', COALESCE(v_user_farms, '[]'::jsonb)
    )
    INTO v_cards
    FROM gateway_cards gc
    LEFT JOIN gateway_access ga ON ga.card_id = gc.id AND ga.user_id = p_user_id
    WHERE gc.is_active = true
    AND (
      ga.status = 'active' 
      AND (ga.valid_until IS NULL OR ga.valid_until > now())
      OR gc.card_key = 'my_work'  -- my_work متاح للجميع
    );
  END IF;

  RETURN v_cards;
END;
$$;
