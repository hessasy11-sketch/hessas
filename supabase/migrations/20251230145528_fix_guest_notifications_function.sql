/*
  # إصلاح دالة إشعارات الزوار

  1. التغييرات
    - حذف الدالات القديمة المتعارضة
    - إنشاء دالة جديدة بسيطة للحصول على إشعارات الزوار النشطة
    
  2. الوظيفة
    - إرجاع جميع الإشعارات النشطة والصالحة للعرض
    - الترتيب حسب الأولوية ثم التاريخ
*/

-- حذف الدالات القديمة
DROP FUNCTION IF EXISTS get_active_guest_notifications();
DROP FUNCTION IF EXISTS get_active_guest_notifications(text);

-- إنشاء دالة جديدة بسيطة
CREATE OR REPLACE FUNCTION get_active_guest_notifications()
RETURNS TABLE (
  id uuid,
  type text,
  priority text,
  title text,
  message text,
  icon text,
  link text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id,
    gn.type,
    gn.priority,
    gn.title,
    gn.message,
    gn.icon,
    gn.link,
    gn.created_at
  FROM b2f_guest_notifications gn
  WHERE 
    gn.is_active = true
    AND gn.start_date <= NOW()
    AND (gn.end_date IS NULL OR gn.end_date >= NOW())
  ORDER BY 
    CASE gn.priority
      WHEN 'urgent' THEN 1
      WHEN 'important' THEN 2
      ELSE 3
    END,
    gn.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
