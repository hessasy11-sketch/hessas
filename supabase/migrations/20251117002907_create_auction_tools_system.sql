/*
  # Create Auction Tools System

  1. New Tables
    - `auction_tools`
      - `id` (uuid, primary key)
      - `tool_key` (text, unique) - Unique identifier for the tool
      - `tool_name_ar` (text) - Arabic name
      - `tool_name_en` (text) - English name
      - `description_ar` (text) - Arabic description
      - `icon` (text) - Icon identifier
      - `category` (text) - Tool category (basic, premium, ai)
      - `available_in_free` (boolean) - Available in free plan
      - `available_in_silver` (boolean) - Available in silver plan
      - `available_in_gold` (boolean) - Available in gold plan
      - `requires_ai` (boolean) - Requires AI features
      - `display_order` (integer) - Display order
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `auction_tools` table
    - Add policies for read access (all authenticated users)
    - Add policies for admin write access
*/

CREATE TABLE IF NOT EXISTS auction_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key text UNIQUE NOT NULL,
  tool_name_ar text NOT NULL,
  tool_name_en text NOT NULL,
  description_ar text,
  icon text,
  category text NOT NULL DEFAULT 'basic',
  available_in_free boolean DEFAULT false,
  available_in_silver boolean DEFAULT false,
  available_in_gold boolean DEFAULT true,
  requires_ai boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auction_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction tools"
  ON auction_tools
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage auction tools"
  ON auction_tools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'admin'
    )
  );

-- Insert auction tools based on plan requirements
INSERT INTO auction_tools (tool_key, tool_name_ar, tool_name_en, description_ar, icon, category, available_in_free, available_in_silver, available_in_gold, requires_ai, display_order)
VALUES
  -- Free Plan Tools (4 tools)
  ('close_auction', 'إغلاق المزاد', 'Close Auction', 'إغلاق المزاد قبل الموعد المحدد', 'lock', 'basic', true, true, true, false, 1),
  ('mark_sold', 'تم البيع', 'Mark as Sold', 'تحديد المزاد كمباع', 'check-circle', 'basic', true, true, true, false, 2),
  ('share_auction', 'مشاركة', 'Share Auction', 'مشاركة المزاد على وسائل التواصل', 'share-2', 'basic', true, true, true, false, 3),
  ('republish_24h', 'إعادة نشر بعد 24 ساعة', 'Republish After 24h', 'إعادة نشر المزاد تلقائياً بعد 24 ساعة', 'rotate-ccw', 'basic', true, true, true, false, 4),

  -- Silver Plan Tools (3 additional tools)
  ('extend_auction', 'تمديد المزاد', 'Extend Auction', 'تمديد مدة المزاد (اختيار المدة)', 'clock', 'premium', false, true, true, false, 5),
  ('closing_alert', 'إعلان قرب الانتهاء', 'Closing Soon Alert', 'إرسال إشعار للمتابعين عن قرب انتهاء المزاد', 'alert-triangle', 'premium', false, true, true, false, 6),
  ('republish_now', 'إعادة نشر فوري', 'Republish Now', 'إعادة نشر المزاد فوراً', 'refresh-cw', 'premium', false, true, true, false, 7),

  -- Gold Plan Tools (AI features - 5 additional tools)
  ('smart_assistant', 'المساعد الذكي', 'Smart Assistant', 'مساعد ذكي لإدارة المزاد', 'bot', 'ai', false, false, true, true, 8),
  ('extend_suggestions', 'توصيات التمديد', 'Extension Suggestions', 'اقتراحات ذكية لتمديد المزاد', 'lightbulb', 'ai', false, false, true, true, 9),
  ('bidder_analysis', 'تحليل المزايدين', 'Bidder Analysis', 'تحليل تفاعل وسلوك المزايدين', 'bar-chart-2', 'ai', false, false, true, true, 10),
  ('auto_messages', 'رسائل تشجيعية', 'Auto Messages', 'إرسال رسائل تشجيعية تلقائية للمهتمين', 'message-circle', 'ai', false, false, true, true, 11),
  ('timing_optimizer', 'أفضل وقت للإغلاق', 'Timing Optimizer', 'اقتراح أفضل وقت لإغلاق أو تمديد المزاد', 'target', 'ai', false, false, true, true, 12);
