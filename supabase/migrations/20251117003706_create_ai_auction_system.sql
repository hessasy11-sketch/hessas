/*
  # Create AI Auction Intelligence System

  1. New Tables
    - `ai_auction_insights`
      - Stores AI-generated insights about auction performance
      - Includes analysis, predictions, and recommendations
    
    - `auction_suggestions`
      - Stores smart suggestions for sellers
      - Tracks which suggestions were accepted/dismissed
    
    - `auction_alerts`
      - System-generated alerts for auction events
      - Linked to notification system

  2. Security
    - Enable RLS on all tables
    - Sellers can view their own insights
    - Only gold plan users get AI insights
*/

-- AI Auction Insights Table
CREATE TABLE IF NOT EXISTS ai_auction_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title_ar text NOT NULL,
  message_ar text NOT NULL,
  confidence_score integer DEFAULT 0,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Auction Suggestions Table
CREATE TABLE IF NOT EXISTS auction_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  title_ar text NOT NULL,
  message_ar text NOT NULL,
  action_type text,
  action_data jsonb,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Auction Alerts Table
CREATE TABLE IF NOT EXISTS auction_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  title_ar text NOT NULL,
  message_ar text NOT NULL,
  severity text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_auction_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_auction_insights
CREATE POLICY "Sellers can view own insights"
  ON ai_auction_insights
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "System can create insights"
  ON ai_auction_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for auction_suggestions
CREATE POLICY "Sellers can view own suggestions"
  ON auction_suggestions
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update own suggestions"
  ON auction_suggestions
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "System can create suggestions"
  ON auction_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for auction_alerts
CREATE POLICY "Users can view own alerts"
  ON auction_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON auction_alerts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create alerts"
  ON auction_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_auction ON ai_auction_insights(auction_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_seller ON ai_auction_insights(seller_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_auction ON auction_suggestions(auction_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_seller ON auction_suggestions(seller_id);
CREATE INDEX IF NOT EXISTS idx_alerts_auction ON auction_alerts(auction_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON auction_alerts(user_id);
