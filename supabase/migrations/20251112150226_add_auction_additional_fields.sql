/*
  # إضافة حقول إضافية للمزادات

  1. إضافة أعمدة جديدة لجدول auctions
    - `item_condition` (text): حالة السلعة (جديد، مستخدم، ممتاز، جيد)
    - `item_type` (text): نوع السلعة
    - `item_quantity` (integer): العدد/الكمية
    - `item_quality` (text): الجودة
    - `item_features` (text[]): المميزات الإضافية
    - `has_video` (boolean): هل يحتوي على فيديو
    - `video_url` (text): رابط الفيديو

  2. لا تحتاج RLS لأن الجدول موجود مسبقاً
*/

-- إضافة حقول إضافية للمزادات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'item_condition'
  ) THEN
    ALTER TABLE auctions ADD COLUMN item_condition text DEFAULT 'جديد';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE auctions ADD COLUMN item_type text DEFAULT 'مزاد مباشر';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'item_quantity'
  ) THEN
    ALTER TABLE auctions ADD COLUMN item_quantity integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'item_quality'
  ) THEN
    ALTER TABLE auctions ADD COLUMN item_quality text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'item_features'
  ) THEN
    ALTER TABLE auctions ADD COLUMN item_features text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'has_video'
  ) THEN
    ALTER TABLE auctions ADD COLUMN has_video boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE auctions ADD COLUMN video_url text;
  END IF;
END $$;

-- دالة لحساب عدد المزايدين الفريدين
CREATE OR REPLACE FUNCTION update_bidders_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auctions
  SET bidders_count = (
    SELECT COUNT(DISTINCT sender_id)
    FROM chat_messages
    WHERE auction_id = NEW.auction_id
    AND sender_id IS NOT NULL
  )
  WHERE id = NEW.auction_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل المحفز لتحديث عدد المزايدين
DROP TRIGGER IF EXISTS on_chat_message_update_bidders ON chat_messages;
CREATE TRIGGER on_chat_message_update_bidders
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_bidders_count();