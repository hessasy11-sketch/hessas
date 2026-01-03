/*
  # نظام العروض الترويجية

  1. New Tables
    - `promotional_offers` - العروض الترويجية
  
  2. Changes to user_subscriptions
    - إضافة حقول الأشهر المجانية
  
  3. Security
    - Enable RLS on `promotional_offers` table
*/

-- إضافة حقل الأشهر المجانية المتبقية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'bonus_months_remaining'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN bonus_months_remaining integer DEFAULT 0;
  END IF;
END $$;

-- إضافة حقل الاشتراك الترويجي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'is_promotional'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN is_promotional boolean DEFAULT false;
  END IF;
END $$;

-- إضافة حقل معرف العرض
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'promotional_offer_id'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN promotional_offer_id uuid;
  END IF;
END $$;

-- إنشاء جدول العروض الترويجية
CREATE TABLE IF NOT EXISTS promotional_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  offer_type text DEFAULT 'free_month_bonus' NOT NULL,
  offer_title text NOT NULL,
  offer_description text NOT NULL,
  target_plan_id uuid REFERENCES subscription_plans(id),
  bonus_months integer DEFAULT 1,
  offer_starts_at timestamptz DEFAULT now(),
  offer_expires_at timestamptz NOT NULL,
  status text DEFAULT 'active',
  shown_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  ai_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotional_offers ENABLE ROW LEVEL SECURITY;

-- Users can view their own offers
CREATE POLICY "Users can view own promotional offers"
  ON promotional_offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own offers (accept/reject)
CREATE POLICY "Users can update own promotional offers"
  ON promotional_offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all offers
CREATE POLICY "Admin can view all promotional offers"
  ON promotional_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Admin can manage all offers
CREATE POLICY "Admin can manage all promotional offers"
  ON promotional_offers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Service role can manage (for Edge Functions)
CREATE POLICY "Service role can manage promotional offers"
  ON promotional_offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
