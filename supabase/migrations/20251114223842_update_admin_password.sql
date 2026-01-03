/*
  # Update Admin Password
  
  1. Changes
    - Update admin account password to '1111'
    
  2. Security
    - Uses secure password update method
*/

-- Update admin password to '1111'
UPDATE auth.users
SET 
  encrypted_password = crypt('1111', gen_salt('bf')),
  updated_at = now()
WHERE email = '0511111110@agriauction.demo';
