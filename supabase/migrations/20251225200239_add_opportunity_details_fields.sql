/*
  # إضافة حقول تفاصيل العرض

  1. تحديثات على جدول investment_opportunity_cards
    - إضافة حقل region (المنطقة)
    - إضافة حقل total_trees (إجمالي الأشجار)
    - إضافة حقل reserved_trees (الأشجار المحجوزة)
    - إضافة حقل farm_features (مميزات المزرعة)
    - إضافة حقل price_note (توضيح السعر)
    - إضافة حقل offer_name (اسم العرض)
*/

-- إضافة الحقول الجديدة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'offer_name'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN offer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'region'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN region text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'total_trees'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN total_trees integer DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'reserved_trees'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN reserved_trees integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'farm_features'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN farm_features jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunity_cards' AND column_name = 'price_note'
  ) THEN
    ALTER TABLE investment_opportunity_cards ADD COLUMN price_note text DEFAULT 'المبلغ يغطي كامل مدة العقد. لا توجد رسوم سنوية.';
  END IF;
END $$;

-- تحديث البيانات الموجودة بقيم افتراضية
UPDATE investment_opportunity_cards 
SET 
  offer_name = COALESCE(offer_name, 'عرض استثماري في ' || type),
  region = COALESCE(region, 'المنطقة الوسطى'),
  total_trees = COALESCE(total_trees, 100),
  reserved_trees = COALESCE(reserved_trees, FLOOR(RANDOM() * 60)::integer),
  farm_features = COALESCE(farm_features, '["نظام ري متطور", "إدارة احترافية", "تقارير شهرية", "تأمين شامل"]'::jsonb),
  price_note = COALESCE(price_note, 'المبلغ يغطي كامل مدة العقد. لا توجد رسوم سنوية.')
WHERE offer_name IS NULL OR region IS NULL;
