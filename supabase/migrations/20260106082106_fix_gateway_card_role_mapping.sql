/*
  # قَسْمَة بطاقات البوابة على الأدوار (تصحيح)

  ## الهدف
  تحديد من يرى كل بطاقة في بوابة التاج حسب دوره (ظهور فقط، لا صلاحيات تنفيذ)

  ## التحديثات
  1. إضافة عمود allowed_roles إلى gateway_cards
  2. تحديث البطاقات بالأدوار المصرح لها
  3. إعادة إنشاء دالة get_user_gateway_cards مع القَسْمَة
  4. GM Bypass دائماً نشط
*/

-- إضافة عمود allowed_roles (jsonb array)
ALTER TABLE gateway_cards
ADD COLUMN IF NOT EXISTS allowed_roles jsonb DEFAULT '[]'::jsonb;

-- تحديث البطاقات بالأدوار المصرح لها

-- 1. غرفة القيادة العليا (GM Only)
UPDATE gateway_cards
SET allowed_roles = '["general_manager"]'::jsonb
WHERE card_key = 'executive_command';

-- 2. B2F Operations Room
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "b2f_assistant", "national_farm_manager"]'::jsonb
WHERE card_key = 'b2f_operations_room';

-- 3. B2B Operations Room
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "b2b_assistant", "auction_supervisor"]'::jsonb
WHERE card_key = 'b2b_operations_room';

-- 4. قيادة المزارع
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "national_farm_manager", "operations_manager"]'::jsonb
WHERE card_key = 'farm_command';

-- 5. لوحة المزرعة (ديناميكي - يعتمد على التعيين)
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "farm_manager", "farm_supervisor", "farm_worker"]'::jsonb
WHERE card_key = 'farm_workspace';

-- 6. عملي اليوم (متاح للجميع)
UPDATE gateway_cards
SET allowed_roles = '["ALL"]'::jsonb
WHERE card_key = 'my_work';

-- 7. المالية
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "finance_manager", "accountant", "finance_assistant"]'::jsonb
WHERE card_key = 'finance_center';

-- 8. التسويق
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "marketing_manager", "marketing_staff"]'::jsonb
WHERE card_key = 'marketing_center';

-- 9. الشركاء/VIP
UPDATE gateway_cards
SET allowed_roles = '["general_manager", "partners_manager"]'::jsonb
WHERE card_key = 'partners_vip';

-- 10. إدارة الموظفين (GM Only)
UPDATE gateway_cards
SET allowed_roles = '["general_manager"]'::jsonb
WHERE card_key = 'staff_permissions';

-- 11. إعدادات المنصة (GM Only)
UPDATE gateway_cards
SET allowed_roles = '["general_manager"]'::jsonb
WHERE card_key = 'platform_settings';

-- دالة للحصول على دور المستخدم
CREATE OR REPLACE FUNCTION get_user_role_for_gateway(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM platform_staff
  WHERE id = p_user_id
  AND is_active = true;

  RETURN v_role;
END;
$$;

-- دالة للتحقق من صلاحية رؤية البطاقة
CREATE OR REPLACE FUNCTION can_user_see_card(
  p_user_id uuid,
  p_card_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_allowed_roles jsonb;
BEGIN
  -- الحصول على دور المستخدم
  SELECT role INTO v_user_role
  FROM platform_staff
  WHERE id = p_user_id
  AND is_active = true;

  -- إذا لم يوجد دور، المستخدم غير صالح
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- GM Bypass: يرى كل شيء
  IF v_user_role = 'general_manager' THEN
    RETURN true;
  END IF;

  -- الحصول على الأدوار المصرح لها للبطاقة
  SELECT allowed_roles INTO v_allowed_roles
  FROM gateway_cards
  WHERE card_key = p_card_key
  AND is_active = true;

  -- إذا لم توجد البطاقة، ممنوع
  IF v_allowed_roles IS NULL THEN
    RETURN false;
  END IF;

  -- إذا كانت البطاقة متاحة للجميع (ALL)
  IF v_allowed_roles ? 'ALL' THEN
    RETURN true;
  END IF;

  -- التحقق من وجود دور المستخدم في القائمة المصرح لها
  IF v_allowed_roles ? v_user_role THEN
    RETURN true;
  END IF;

  -- في حالة farm_workspace، تحقق من تعيين المستخدم على مزرعة
  IF p_card_key = 'farm_workspace' THEN
    RETURN EXISTS (
      SELECT 1 FROM farm_team_members
      WHERE staff_id = p_user_id
      AND status = 'active'
    );
  END IF;

  -- افتراضياً: ممنوع
  RETURN false;
END;
$$;

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_user_gateway_cards(uuid);

-- إعادة إنشاء دالة get_user_gateway_cards مع القَسْمَة
CREATE OR REPLACE FUNCTION get_user_gateway_cards(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  card_key text,
  title_ar text,
  title_en text,
  description_ar text,
  description_en text,
  icon text,
  color text,
  gradient_from text,
  gradient_to text,
  route_path text,
  display_order int,
  allowed_roles jsonb,
  user_role text,
  access_reason text,
  is_gm_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_is_gm boolean;
BEGIN
  -- الحصول على دور المستخدم
  SELECT ps.role INTO v_user_role
  FROM platform_staff ps
  WHERE ps.id = p_user_id
  AND ps.is_active = true;

  -- إذا لم يوجد دور، إرجاع فارغ
  IF v_user_role IS NULL THEN
    RETURN;
  END IF;

  -- التحقق: هل المستخدم GM؟
  v_is_gm := (v_user_role = 'general_manager');

  -- إذا كان GM: إرجاع جميع البطاقات
  IF v_is_gm THEN
    RETURN QUERY
    SELECT 
      gc.id,
      gc.card_key,
      gc.title_ar,
      gc.title_en,
      gc.description_ar,
      gc.description_en,
      gc.icon,
      gc.color,
      gc.gradient_from,
      gc.gradient_to,
      gc.route_path,
      gc.display_order,
      gc.allowed_roles,
      v_user_role as user_role,
      'GM Bypass - Full Access' as access_reason,
      true as is_gm_access
    FROM gateway_cards gc
    WHERE gc.is_active = true
    ORDER BY gc.display_order;
  ELSE
    -- غير GM: إرجاع البطاقات المصرح لها حسب الدور
    RETURN QUERY
    SELECT 
      gc.id,
      gc.card_key,
      gc.title_ar,
      gc.title_en,
      gc.description_ar,
      gc.description_en,
      gc.icon,
      gc.color,
      gc.gradient_from,
      gc.gradient_to,
      gc.route_path,
      gc.display_order,
      gc.allowed_roles,
      v_user_role as user_role,
      CASE
        WHEN gc.allowed_roles ? 'ALL' THEN 'Available to all staff'
        WHEN gc.allowed_roles ? v_user_role THEN 'Role-based access: ' || v_user_role
        WHEN gc.card_key = 'farm_workspace' AND EXISTS (
          SELECT 1 FROM farm_team_members
          WHERE staff_id = p_user_id AND status = 'active'
        ) THEN 'Farm team member'
        ELSE 'Unknown access'
      END as access_reason,
      false as is_gm_access
    FROM gateway_cards gc
    WHERE gc.is_active = true
    AND (
      -- البطاقات المتاحة للجميع
      gc.allowed_roles ? 'ALL'
      OR
      -- البطاقات المصرح لها لدور المستخدم
      gc.allowed_roles ? v_user_role
      OR
      -- بطاقة farm_workspace إذا كان المستخدم معين على مزرعة
      (gc.card_key = 'farm_workspace' AND EXISTS (
        SELECT 1 FROM farm_team_members
        WHERE staff_id = p_user_id AND status = 'active'
      ))
    )
    ORDER BY gc.display_order;
  END IF;
END;
$$;

-- دالة مساعدة لعرض خريطة القَسْمَة الكاملة
CREATE OR REPLACE FUNCTION get_gateway_mapping_table()
RETURNS TABLE (
  card_key text,
  title_ar text,
  route_path text,
  allowed_roles jsonb,
  roles_count int,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.card_key,
    gc.title_ar,
    gc.route_path,
    gc.allowed_roles,
    jsonb_array_length(gc.allowed_roles) as roles_count,
    CASE 
      WHEN gc.card_key IN ('executive_command', 'staff_permissions', 'platform_settings') 
        THEN 'GM Only - Bypass كامل'
      WHEN gc.card_key = 'my_work' 
        THEN 'متاح للجميع - Landing لغير GM'
      WHEN gc.card_key = 'farm_workspace' 
        THEN 'ديناميكي - حسب farm_id'
      WHEN gc.card_key = 'partners_vip'
        THEN 'Coming Soon'
      ELSE 'Role-based access'
    END as notes
  FROM gateway_cards gc
  WHERE gc.is_active = true
  ORDER BY gc.display_order;
END;
$$;

-- إنشاء view للمراقبة
CREATE OR REPLACE VIEW gateway_cards_mapping AS
SELECT 
  gc.card_key,
  gc.title_ar,
  gc.title_en,
  gc.route_path,
  gc.allowed_roles,
  jsonb_array_length(gc.allowed_roles) as roles_count,
  gc.display_order,
  gc.is_active,
  CASE 
    WHEN gc.allowed_roles ? 'ALL' THEN 'متاح للجميع'
    WHEN gc.allowed_roles ? 'general_manager' AND jsonb_array_length(gc.allowed_roles) = 1 THEN 'GM فقط'
    ELSE 'أدوار محددة'
  END as access_type
FROM gateway_cards gc
ORDER BY gc.display_order;

-- Grant permissions
GRANT SELECT ON gateway_cards_mapping TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_role_for_gateway(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_user_see_card(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_gateway_cards(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_gateway_mapping_table() TO authenticated, anon;

-- تعليق توضيحي
COMMENT ON COLUMN gateway_cards.allowed_roles IS 'قائمة الأدوار المصرح لها برؤية هذه البطاقة. ["ALL"] يعني متاح للجميع. GM دائماً له bypass.';
COMMENT ON FUNCTION can_user_see_card IS 'التحقق من صلاحية رؤية المستخدم لبطاقة معينة حسب دوره';
COMMENT ON FUNCTION get_gateway_mapping_table IS 'إرجاع جدول القَسْمَة الكامل لجميع البطاقات';
