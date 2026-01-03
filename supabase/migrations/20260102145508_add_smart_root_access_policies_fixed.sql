/*
  # صلاحيات ذكية لصاحب المنصة - نسخة محسنة

  1. Changes
    - إضافة سياسات RLS بأمان
    - دوال مساعدة محسّنة
    
  2. Security
    - صاحب المنصة = صلاحيات كاملة
*/

-- دالة مساعدة لإضافة سياسة بأمان
CREATE OR REPLACE FUNCTION add_root_policy_safe(p_table_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND tables.table_name = p_table_name
  ) THEN
    EXECUTE format('DROP POLICY IF EXISTS "Platform owner full access" ON %I', p_table_name);
    
    EXECUTE format('
      CREATE POLICY "Platform owner full access"
      ON %I FOR ALL
      USING (is_platform_owner())
      WITH CHECK (is_platform_owner())
    ', p_table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- تطبيق السياسات
SELECT add_root_policy_safe('b2f_farms');
SELECT add_root_policy_safe('platform_staff');
SELECT add_root_policy_safe('roles_catalog');
SELECT add_root_policy_safe('auctions');
SELECT add_root_policy_safe('profiles');
SELECT add_root_policy_safe('subscription_plans');
SELECT add_root_policy_safe('user_subscriptions');
SELECT add_root_policy_safe('notifications');
SELECT add_root_policy_safe('wallets');
SELECT add_root_policy_safe('transactions');
SELECT add_root_policy_safe('dashboard_sections');
SELECT add_root_policy_safe('categories');
SELECT add_root_policy_safe('farm_team');
SELECT add_root_policy_safe('bids');
SELECT add_root_policy_safe('chat_messages');
SELECT add_root_policy_safe('user_favorites');
SELECT add_root_policy_safe('user_followers');
SELECT add_root_policy_safe('user_purchase_requests');
SELECT add_root_policy_safe('bank_transfers');
SELECT add_root_policy_safe('subscription_requests');
SELECT add_root_policy_safe('plan_tools');
SELECT add_root_policy_safe('promotional_offers');
SELECT add_root_policy_safe('auction_reports');
SELECT add_root_policy_safe('auction_blocks');
SELECT add_root_policy_safe('seller_ratings');
SELECT add_root_policy_safe('platform_administrators');
SELECT add_root_policy_safe('team_templates');

-- دوال الصلاحيات المحسنة
CREATE OR REPLACE FUNCTION has_admin_access()
RETURNS boolean AS $$
BEGIN
  IF is_platform_owner() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM platform_administrators
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_b2f_access()
RETURNS boolean AS $$
BEGIN
  IF is_platform_owner() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid()
    AND department = 'B2F'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_b2b_access()
RETURNS boolean AS $$
BEGIN
  IF is_platform_owner() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid()
    AND department = 'B2B'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS add_root_policy_safe(text);
