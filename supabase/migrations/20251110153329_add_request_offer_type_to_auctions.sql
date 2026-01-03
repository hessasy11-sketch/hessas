/*
  # إضافة نوع الطلب/العرض للمزادات

  1. التعديلات
    - إضافة عمود `auction_type` لجدول المزادات (request/offer)
    - إضافة عمود `sub_type` للتصنيفات (request/offer/both)
    - تحديث RLS policies للتوافق مع التغييرات الجديدة
  
  2. ملاحظات
    - auction_type: request (طلب) أو offer (عرض) - يستخدم فقط في قسم الشركات
    - sub_type للتصنيفات: request (خاص بالطلبات)، offer (خاص بالعروض)، both (كلاهما)
    - القيم الافتراضية تسمح بالتوافق مع البيانات الحالية
*/

-- إضافة عمود auction_type لجدول المزادات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'auction_type'
  ) THEN
    ALTER TABLE auctions 
    ADD COLUMN auction_type text CHECK (auction_type IN ('request', 'offer')) DEFAULT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_auctions_auction_type ON auctions(auction_type);
  END IF;
END $$;

-- إضافة عمود sub_type لجدول التصنيفات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auction_categories' AND column_name = 'sub_type'
  ) THEN
    ALTER TABLE auction_categories 
    ADD COLUMN sub_type text CHECK (sub_type IN ('request', 'offer', 'both')) DEFAULT 'both';
    
    CREATE INDEX IF NOT EXISTS idx_categories_sub_type ON auction_categories(sub_type);
  END IF;
END $$;

-- تحديث التصنيفات الموجودة في قسم public لتكون both
UPDATE auction_categories
SET sub_type = 'both'
WHERE section = 'public' AND sub_type IS NULL;

-- إضافة comment للتوضيح
COMMENT ON COLUMN auctions.auction_type IS 'نوع المزاد: request (طلب) أو offer (عرض) - يستخدم فقط في قسم companies';
COMMENT ON COLUMN auction_categories.sub_type IS 'نوع فرعي للتصنيف: request (طلبات فقط)، offer (عروض فقط)، both (كلاهما)';
