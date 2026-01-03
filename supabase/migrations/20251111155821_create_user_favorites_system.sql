/*
  # إنشاء نظام المفضلة الزراعية

  1. الجدول الجديد
    - `user_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `auction_id` (uuid, foreign key to auctions)
      - `created_at` (timestamptz)
      - UNIQUE constraint على (user_id, auction_id)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والكتابة والحذف للمستخدمين المصادقين

  3. الفهارس
    - فهرس على user_id للأداء
    - فهرس على auction_id

  4. الملاحظات
    - يسمح بإضافة مزاد واحد مرة واحدة فقط للمستخدم
    - الحذف يتم بشكل مباشر (cascade) عند حذف المستخدم أو المزاد
*/

-- إنشاء جدول المفضلة
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, auction_id)
);

-- تفعيل RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_auction_id ON user_favorites(auction_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- تسجيل إضافة/إزالة المفضلة في سجل الأنشطة
CREATE OR REPLACE FUNCTION log_favorite_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activities (
      user_id,
      activity_type,
      activity_description,
      reference_id
    )
    SELECT
      NEW.user_id,
      'favorite_added',
      'أضاف مزاد "' || a.title || '" إلى المفضلة',
      NEW.auction_id
    FROM auctions a
    WHERE a.id = NEW.auction_id;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_activities (
      user_id,
      activity_type,
      activity_description,
      reference_id
    )
    SELECT
      OLD.user_id,
      'favorite_removed',
      'أزال مزاد من المفضلة',
      OLD.auction_id
    FROM auctions a
    WHERE a.id = OLD.auction_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_favorite_changes
  AFTER INSERT OR DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION log_favorite_activity();

-- إضافة comment للتوضيح
COMMENT ON TABLE user_favorites IS 'جدول لحفظ المزادات المفضلة للمستخدمين';
COMMENT ON COLUMN user_favorites.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN user_favorites.auction_id IS 'معرف المزاد المفضل';
COMMENT ON COLUMN user_favorites.created_at IS 'تاريخ الإضافة للمفضلة';
