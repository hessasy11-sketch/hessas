/*
  # Visits Tracking System - نظام تتبع الزيارات

  ## الهدف
  تتبع زيارات الصفحات لتوفير رؤية واضحة للمدير العام عن أداء المنصة
  
  ## الجدول الرئيسي
  - page_views: تسجيل كل زيارة صفحة
  
  ## الدوال
  1. track_page_view() - تسجيل زيارة صفحة
  2. get_visits_summary() - ملخص الزيارات لليوم
  3. get_top_farms_24h() - أكثر 5 مزارع زيارة في 24 ساعة
  4. get_top_auctions_24h() - أكثر 5 مزادات زيارة في 24 ساعة
  
  ## الأقسام
  1. الجداول
  2. الدوال
  3. RLS Policies
  4. منح الصلاحيات
*/

-- ============================================
-- 1. جدول تتبع الزيارات
-- ============================================

CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- معلومات الزيارة
  path text NOT NULL,
  user_agent text,
  
  -- الربط بالكيانات (اختياري)
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE SET NULL,
  auction_id uuid REFERENCES auctions(id) ON DELETE SET NULL,
  
  -- معلومات إضافية
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_farm_id ON page_views(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_auction_id ON page_views(auction_id) WHERE auction_id IS NOT NULL;

-- ============================================
-- 2. دالة تسجيل الزيارة
-- ============================================

CREATE OR REPLACE FUNCTION track_page_view(
  p_path text,
  p_user_agent text DEFAULT NULL,
  p_farm_id uuid DEFAULT NULL,
  p_auction_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_view_id uuid;
BEGIN
  INSERT INTO page_views (
    path,
    user_agent,
    farm_id,
    auction_id,
    session_id,
    metadata
  )
  VALUES (
    p_path,
    p_user_agent,
    p_farm_id,
    p_auction_id,
    p_session_id,
    p_metadata
  )
  RETURNING id INTO v_view_id;

  RETURN v_view_id;
END;
$$;

-- ============================================
-- 3. دالة الحصول على ملخص الزيارات
-- ============================================

CREATE OR REPLACE FUNCTION get_visits_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_today integer;
  v_b2f_today integer;
  v_b2b_today integer;
  v_total_week integer;
BEGIN
  -- زيارات اليوم الإجمالية
  SELECT COUNT(*)
  INTO v_total_today
  FROM page_views
  WHERE created_at >= CURRENT_DATE;

  -- زيارات B2F اليوم
  SELECT COUNT(*)
  INTO v_b2f_today
  FROM page_views
  WHERE created_at >= CURRENT_DATE
    AND (path LIKE '%/b2f/%' OR farm_id IS NOT NULL);

  -- زيارات B2B اليوم
  SELECT COUNT(*)
  INTO v_b2b_today
  FROM page_views
  WHERE created_at >= CURRENT_DATE
    AND (path LIKE '%/auction/%' OR auction_id IS NOT NULL);

  -- زيارات الأسبوع
  SELECT COUNT(*)
  INTO v_total_week
  FROM page_views
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

  RETURN jsonb_build_object(
    'total_today', COALESCE(v_total_today, 0),
    'b2f_today', COALESCE(v_b2f_today, 0),
    'b2b_today', COALESCE(v_b2b_today, 0),
    'total_week', COALESCE(v_total_week, 0),
    'as_of', now()
  );
END;
$$;

-- ============================================
-- 4. دالة أكثر 5 مزارع زيارة في 24 ساعة
-- ============================================

CREATE OR REPLACE FUNCTION get_top_farms_24h()
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  visit_count bigint,
  last_visit timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.farm_id,
    f.name,
    COUNT(*) as visit_count,
    MAX(pv.created_at) as last_visit
  FROM page_views pv
  INNER JOIN b2f_farms f ON f.id = pv.farm_id
  WHERE pv.farm_id IS NOT NULL
    AND pv.created_at >= now() - INTERVAL '24 hours'
  GROUP BY pv.farm_id, f.name
  ORDER BY visit_count DESC, last_visit DESC
  LIMIT 5;
END;
$$;

-- ============================================
-- 5. دالة أكثر 5 مزادات زيارة في 24 ساعة
-- ============================================

CREATE OR REPLACE FUNCTION get_top_auctions_24h()
RETURNS TABLE (
  auction_id uuid,
  auction_title text,
  auction_status text,
  visit_count bigint,
  last_visit timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.auction_id,
    a.title,
    a.status,
    COUNT(*) as visit_count,
    MAX(pv.created_at) as last_visit
  FROM page_views pv
  INNER JOIN auctions a ON a.id = pv.auction_id
  WHERE pv.auction_id IS NOT NULL
    AND pv.created_at >= now() - INTERVAL '24 hours'
  GROUP BY pv.auction_id, a.title, a.status
  ORDER BY visit_count DESC, last_visit DESC
  LIMIT 5;
END;
$$;

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- السماح بالإدراج من أي شخص (تسجيل الزيارات)
CREATE POLICY "Anyone can track page views"
  ON page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح بالقراءة للـ service role والمسؤولين فقط
CREATE POLICY "Service role can read all page views"
  ON page_views
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================
-- 7. منح الصلاحيات
-- ============================================

GRANT EXECUTE ON FUNCTION track_page_view TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_visits_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_farms_24h TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_auctions_24h TO anon, authenticated;

-- ============================================
-- 8. إضافة بيانات تجريبية (optional للاختبار)
-- ============================================

-- إضافة 50 زيارة عشوائية للاختبار
DO $$
DECLARE
  v_farm_ids uuid[];
  v_auction_ids uuid[];
  i integer;
BEGIN
  -- الحصول على بعض farm_ids
  SELECT ARRAY_AGG(id) INTO v_farm_ids FROM b2f_farms LIMIT 10;
  
  -- الحصول على بعض auction_ids
  SELECT ARRAY_AGG(id) INTO v_auction_ids FROM auctions LIMIT 10;

  -- إضافة زيارات عشوائية
  IF v_farm_ids IS NOT NULL AND array_length(v_farm_ids, 1) > 0 THEN
    FOR i IN 1..30 LOOP
      INSERT INTO page_views (path, farm_id, created_at)
      VALUES (
        '/b2f/farm/' || v_farm_ids[1 + (random() * (array_length(v_farm_ids, 1) - 1))::integer],
        v_farm_ids[1 + (random() * (array_length(v_farm_ids, 1) - 1))::integer],
        now() - (random() * INTERVAL '23 hours')
      );
    END LOOP;
  END IF;

  IF v_auction_ids IS NOT NULL AND array_length(v_auction_ids, 1) > 0 THEN
    FOR i IN 1..30 LOOP
      INSERT INTO page_views (path, auction_id, created_at)
      VALUES (
        '/auction/' || v_auction_ids[1 + (random() * (array_length(v_auction_ids, 1) - 1))::integer],
        v_auction_ids[1 + (random() * (array_length(v_auction_ids, 1) - 1))::integer],
        now() - (random() * INTERVAL '23 hours')
      );
    END LOOP;
  END IF;
END $$;
