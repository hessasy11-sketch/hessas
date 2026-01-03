/*
  # نظام الترتيب الذكي للمزادات المباعة

  1. التغييرات
    - إضافة عمود `display_priority` لتحديد أولوية العرض
    - إضافة عمود `sold_at` لتسجيل تاريخ البيع
    - إضافة عمود `is_featured_eligible` لتحديد أهلية الظهور في الأقسام المميزة
    - إضافة دالة `calculate_auction_priority` لحساب الأولوية تلقائياً
    - إضافة trigger لتحديث الأولوية عند تغيير الحالة
    - إضافة indexes لتحسين الأداء

  2. الأولويات
    - 100: نشط (active)
    - 90: قريب الانتهاء (closing_soon)
    - 80: ممدد (extended)
    - 70: قادم (upcoming)
    - 50: مغلق (closed)
    - 10: مباع (sold) - أقل أولوية

  3. الأمان
    - RLS policies محدثة
*/

-- إضافة الأعمدة الجديدة
ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS display_priority integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS sold_at timestamptz,
ADD COLUMN IF NOT EXISTS is_featured_eligible boolean DEFAULT true;

-- دالة حساب الأولوية
CREATE OR REPLACE FUNCTION calculate_auction_priority(
  auction_status text,
  auction_starts_at timestamptz,
  auction_ends_at timestamptz,
  is_extended boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  priority integer;
  now_time timestamptz := NOW();
  time_until_end interval;
BEGIN
  -- المزادات المباعة: أقل أولوية
  IF auction_status = 'sold' THEN
    RETURN 10;
  END IF;

  -- المزادات المغلقة
  IF auction_status = 'closed' OR auction_ends_at < now_time THEN
    RETURN 50;
  END IF;

  -- المزادات القادمة (لم تبدأ بعد)
  IF auction_starts_at > now_time THEN
    RETURN 70;
  END IF;

  -- حساب الوقت المتبقي
  time_until_end := auction_ends_at - now_time;

  -- المزادات الممددة
  IF is_extended THEN
    RETURN 80;
  END IF;

  -- المزادات قريبة الانتهاء (أقل من ساعتين)
  IF time_until_end < interval '2 hours' THEN
    RETURN 90;
  END IF;

  -- المزادات النشطة
  IF auction_status = 'active' AND auction_starts_at <= now_time AND auction_ends_at > now_time THEN
    RETURN 100;
  END IF;

  -- افتراضي
  RETURN 60;
END;
$$;

-- دالة تحديث الأولوية والأهلية
CREATE OR REPLACE FUNCTION update_auction_display_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حساب الأولوية
  NEW.display_priority := calculate_auction_priority(
    NEW.status,
    NEW.starts_at,
    NEW.ends_at,
    NEW.is_extended
  );

  -- تحديد الأهلية للظهور في الأقسام المميزة
  IF NEW.status = 'sold' THEN
    NEW.is_featured_eligible := false;
    
    -- تسجيل تاريخ البيع إذا لم يكن مسجلاً
    IF NEW.sold_at IS NULL THEN
      NEW.sold_at := NOW();
    END IF;
  ELSIF NEW.status = 'closed' THEN
    NEW.is_featured_eligible := false;
  ELSE
    NEW.is_featured_eligible := true;
  END IF;

  RETURN NEW;
END;
$$;

-- إنشاء trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS auction_display_settings_trigger ON auctions;
CREATE TRIGGER auction_display_settings_trigger
  BEFORE INSERT OR UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_display_settings();

-- تحديث المزادات الحالية
UPDATE auctions
SET display_priority = calculate_auction_priority(status, starts_at, ends_at, is_extended),
    is_featured_eligible = CASE 
      WHEN status IN ('sold', 'closed') THEN false
      ELSE true
    END,
    sold_at = CASE 
      WHEN status = 'sold' AND sold_at IS NULL THEN NOW()
      ELSE sold_at
    END;

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_auctions_display_priority ON auctions(display_priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_featured_eligible ON auctions(is_featured_eligible, display_priority DESC) WHERE is_featured_eligible = true;
CREATE INDEX IF NOT EXISTS idx_auctions_sold_status ON auctions(status, sold_at DESC) WHERE status = 'sold';

-- دالة للحصول على المزادات مع الترتيب الذكي
CREATE OR REPLACE FUNCTION get_sorted_auctions(
  include_sold boolean DEFAULT false,
  featured_only boolean DEFAULT false,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  current_price numeric,
  starting_price numeric,
  images text[],
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  seller_plan_type text,
  is_featured boolean,
  priority_score numeric,
  is_extended boolean,
  display_priority integer,
  sold_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.id,
    a.title,
    a.description,
    a.current_price,
    a.starting_price,
    a.images,
    a.status,
    a.starts_at,
    a.ends_at,
    a.location,
    a.seller_plan_type,
    a.is_featured,
    a.priority_score,
    a.is_extended,
    a.display_priority,
    a.sold_at,
    a.created_at
  FROM auctions a
  WHERE 
    -- تصفية المزادات المباعة إذا لم تكن مطلوبة
    (include_sold = true OR a.status != 'sold')
    -- تصفية المميزة فقط إذا كانت مطلوبة
    AND (featured_only = false OR a.is_featured_eligible = true)
  ORDER BY 
    -- ترتيب حسب نوع الباقة أولاً (ذهبي > فضي > مجاني)
    CASE a.seller_plan_type
      WHEN 'gold' THEN 1
      WHEN 'silver' THEN 2
      ELSE 3
    END,
    -- ثم حسب الأولوية
    a.display_priority DESC,
    -- ثم حسب النقاط (للخطط المدفوعة)
    COALESCE(a.priority_score, 0) DESC,
    -- وأخيراً التاريخ
    a.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

COMMENT ON FUNCTION get_sorted_auctions IS 'دالة للحصول على المزادات مرتبة بشكل ذكي - المزادات المباعة في الأسفل دائماً';
COMMENT ON FUNCTION calculate_auction_priority IS 'حساب أولوية عرض المزاد: 100=نشط، 90=قريب، 80=ممدد، 70=قادم، 50=مغلق، 10=مباع';
