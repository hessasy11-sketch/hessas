/*
  # تحديث دالة التوصيات الذكية

  تحديث دالة get_follow_suggestions لتتوافق مع بنية جدول profiles
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_follow_suggestions(uuid, integer);

-- إنشاء الدالة المحدثة
CREATE OR REPLACE FUNCTION get_follow_suggestions(user_id uuid, limit_count integer DEFAULT 3)
RETURNS TABLE (
  id uuid,
  display_name text,
  phone_number text,
  followers_count integer,
  common_interests integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.phone_number,
    COALESCE(p.followers_count, 0) as followers_count,
    (
      SELECT COUNT(DISTINCT a.category_id)
      FROM auctions a
      WHERE a.owner_id = p.id
      AND a.category_id IN (
        SELECT DISTINCT category_id
        FROM auctions
        WHERE owner_id = user_id
      )
    )::integer as common_interests
  FROM profiles p
  WHERE p.id != user_id
  AND NOT EXISTS (
    SELECT 1 FROM user_followers
    WHERE follower_id = user_id
    AND following_id = p.id
  )
  AND p.id IN (
    SELECT DISTINCT owner_id
    FROM auctions
    WHERE owner_id IS NOT NULL
    AND status = 'active'
  )
  ORDER BY common_interests DESC, followers_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
