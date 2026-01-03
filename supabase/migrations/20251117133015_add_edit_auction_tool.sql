/*
  # إضافة أداة تعديل الإعلان

  1. Changes
    - إضافة أداة 'edit_auction' في جدول plan_tools
    - متاحة لجميع الباقات مع صلاحيات مختلفة

  2. Permissions
    - Free: عنوان، وصف، سعر، صور، موقع
    - Silver+: كل الحقول بما في ذلك الفئة والأوقات
    - Gold: مع المساعد الذكي
*/

INSERT INTO plan_tools (
  tool_key,
  tool_name,
  tool_name_ar,
  description,
  description_ar,
  available_in_free,
  available_in_silver,
  available_in_gold,
  is_active,
  requires_ai,
  access_level,
  display_order
)
VALUES (
  'edit_auction',
  'Edit Auction',
  'تعديل الإعلان',
  'Edit your auction details',
  'تعديل تفاصيل إعلانك - المجانية: العنوان والوصف والسعر والصور - الفضية+: كل التفاصيل',
  true,
  true,
  true,
  true,
  false,
  ARRAY['free', 'silver', 'gold']::text[],
  2
)
ON CONFLICT (tool_key) DO UPDATE SET
  tool_name_ar = EXCLUDED.tool_name_ar,
  description_ar = EXCLUDED.description_ar,
  available_in_free = true,
  available_in_silver = true,
  available_in_gold = true,
  is_active = true;
