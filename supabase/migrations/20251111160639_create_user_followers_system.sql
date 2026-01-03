/*
  # إنشاء نظام المتابعين الزراعيين

  1. الجدول الجديد
    - `user_followers`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, المستخدم الذي يتابع - foreign key to auth.users)
      - `following_id` (uuid, المستخدم المُتابَع - foreign key to auth.users)
      - `created_at` (timestamptz)
      - UNIQUE constraint على (follower_id, following_id)
      - CHECK constraint لمنع المستخدم من متابعة نفسه

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة والحذف للمستخدمين المصادقين

  3. الفهارس
    - فهرس على follower_id للأداء
    - فهرس على following_id
    - فهرس مركب على (follower_id, following_id)

  4. التسجيل التلقائي
    - Trigger لتسجيل المتابعة في سجل الأنشطة
    - تحديث عدد المتابعين في ملف المستخدم

  5. الملاحظات
    - لا يمكن للمستخدم متابعة نفسه
    - يسمح بالمتابعة مرة واحدة فقط
    - الحذف يتم cascade عند حذف أي من المستخدمين
*/

-- إنشاء جدول المتابعين
CREATE TABLE IF NOT EXISTS user_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- تفعيل RLS
ALTER TABLE user_followers ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view all followers"
  ON user_followers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON user_followers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON user_followers FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_followers_follower_id ON user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_following_id ON user_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_composite ON user_followers(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_created_at ON user_followers(created_at DESC);

-- إضافة أعمدة عدد المتابعين للملف الشخصي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN followers_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN following_count integer DEFAULT 0;
  END IF;
END $$;

-- تسجيل المتابعة في سجل الأنشطة وتحديث العدادات
CREATE OR REPLACE FUNCTION handle_follower_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- تسجيل نشاط المتابعة
    INSERT INTO user_activities (
      user_id,
      activity_type,
      activity_description,
      reference_id
    )
    SELECT
      NEW.follower_id,
      'user_followed',
      'تابع المستخدم ' || p.display_name,
      NEW.following_id
    FROM profiles p
    WHERE p.id = NEW.following_id;

    -- تحديث عدد المتابعين
    UPDATE profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

    -- تحديث عدد المتابَعين
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- تسجيل نشاط إلغاء المتابعة
    INSERT INTO user_activities (
      user_id,
      activity_type,
      activity_description,
      reference_id
    )
    VALUES (
      OLD.follower_id,
      'user_unfollowed',
      'ألغى متابعة مستخدم',
      OLD.following_id
    );

    -- تحديث عدد المتابعين
    UPDATE profiles
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.following_id;

    -- تحديث عدد المتابَعين
    UPDATE profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_follower_changes_trigger
  AFTER INSERT OR DELETE ON user_followers
  FOR EACH ROW
  EXECUTE FUNCTION handle_follower_changes();

-- دالة للتحقق من المتابعة
CREATE OR REPLACE FUNCTION is_following(follower_user_id uuid, following_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_followers
    WHERE follower_id = follower_user_id
    AND following_id = following_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على توصيات المتابعة
CREATE OR REPLACE FUNCTION get_follow_suggestions(user_id uuid, limit_count integer DEFAULT 3)
RETURNS TABLE (
  id uuid,
  display_name text,
  phone text,
  location text,
  followers_count integer,
  common_interests integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.phone,
    p.location,
    p.followers_count,
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
  ORDER BY common_interests DESC, p.followers_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعليقات توضيحية
COMMENT ON TABLE user_followers IS 'جدول المتابعين والمتابَعين في المنصة الزراعية';
COMMENT ON COLUMN user_followers.follower_id IS 'المستخدم الذي يقوم بالمتابعة';
COMMENT ON COLUMN user_followers.following_id IS 'المستخدم المُتابَع';
COMMENT ON FUNCTION is_following IS 'للتحقق من وجود متابعة بين مستخدمين';
COMMENT ON FUNCTION get_follow_suggestions IS 'للحصول على توصيات المتابعة الذكية';
