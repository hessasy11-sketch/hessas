/*
  # Fix Admin Password Update
  
  1. Changes
    - Update admin password using correct Supabase auth method
    - Set password to '1111' for admin account
    
  2. Security
    - Uses Supabase's built-in password hashing
*/

-- Update admin password using Supabase's correct method
UPDATE auth.users
SET 
  encrypted_password = crypt('1111', gen_salt('bf')),
  updated_at = now()
WHERE email = '0511111110@agriauction.demo';

-- Ensure email is confirmed
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = COALESCE(confirmation_sent_at, now())
WHERE email = '0511111110@agriauction.demo';
