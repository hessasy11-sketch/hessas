/*
  # إصلاح دالة get_user_gateway_cards

  ## المشكلة
  - الدالة تعيد jsonb بدلاً من array
  - Frontend يتوقع array of objects

  ## الحل
  - تحويل jsonb_agg إلى array_agg
  - إرجاع SETOF record
  - أو تبسيط إلى RETURNS TABLE
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_user_gateway_cards(uuid);

-- إعادة إنشاء الدالة بـ RETURNS TABLE
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
  access_level text,
  is_gm_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_gm boolean;
BEGIN
  -- التحقق: هل المستخدم GM؟
  SELECT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE platform_staff.id = p_user_id
    AND platform_staff.role = 'general_manager'
  ) INTO v_is_gm;

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
      'full'::text as access_level,
      true as is_gm_access
    FROM gateway_cards gc
    WHERE gc.is_active = true
    ORDER BY gc.display_order, gc.title_ar;
  ELSE
    -- غير GM: إرجاع البطاقات المصرح بها فقط
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
      ga.access_level,
      false as is_gm_access
    FROM gateway_cards gc
    INNER JOIN gateway_access ga ON ga.card_id = gc.id
    WHERE gc.is_active = true
    AND ga.user_id = p_user_id
    AND ga.status = 'active'
    AND (ga.valid_until IS NULL OR ga.valid_until > now())
    ORDER BY gc.display_order, gc.title_ar;
  END IF;
END;
$$;
