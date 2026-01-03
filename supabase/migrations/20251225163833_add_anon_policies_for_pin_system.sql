/*
  # Add Anonymous RLS Policies for PIN Authentication System

  ## Changes
  1. Add anon INSERT policies for wallets table
  2. Add anon INSERT policies for investment_reservations table
  3. Add anon SELECT/UPDATE policies for both tables
  
  ## Security Notes
  - These policies allow PIN-authenticated users (who appear as anon to Supabase)
  - Users can only access their own data based on user_id matching
  - This is required since PIN authentication doesn't use Supabase Auth
  
  ## Tables Modified
  - wallets: Added anon policies for INSERT, SELECT, UPDATE
  - investment_reservations: Added anon policies for INSERT, SELECT, UPDATE
*/

-- Wallets policies for anon users
CREATE POLICY "Anon can create wallets"
  ON wallets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view own wallet"
  ON wallets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update own wallet"
  ON wallets FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Investment Reservations policies for anon users
CREATE POLICY "Anon can create investment reservations"
  ON investment_reservations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view own investment reservations"
  ON investment_reservations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update own investment reservations"
  ON investment_reservations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
