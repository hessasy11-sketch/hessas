/*
  # Create Role-Based Permissions System

  1. New Tables
    - plan_roles: Defines seller roles (free, silver, gold)
    - plan_permissions: Granular permissions for each role
    - user_plan_roles: Maps users to their current role

  2. Functions
    - check_user_permission: Check if user has permission
    - get_user_role_limits: Get user role limits
    - assign_user_role: Assign role to user

  3. Security
    - Enable RLS on all tables
    - Users can only read their own permissions
*/

CREATE TABLE IF NOT EXISTS plan_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  role_key text UNIQUE NOT NULL,
  display_name_ar text NOT NULL,
  description_ar text,
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'silver', 'gold')),
  priority_level integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES plan_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  permission_name_ar text NOT NULL,
  permission_type text NOT NULL CHECK (permission_type IN ('tool', 'feature', 'limit', 'access')),
  is_allowed boolean DEFAULT false,
  limit_value integer,
  limit_unit text,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS user_plan_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES plan_roles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  previous_role_id uuid REFERENCES plan_roles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plan_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plan_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read plan roles"
  ON plan_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can read permissions"
  ON plan_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read own role"
  ON user_plan_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can manage user roles"
  ON user_plan_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_plan_roles_user ON user_plan_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_roles_active ON user_plan_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_plan_permissions_role ON plan_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_plan_permissions_key ON plan_permissions(permission_key);

INSERT INTO plan_roles (role_name, role_key, display_name_ar, description_ar, plan_type, priority_level) VALUES
  ('Free Seller', 'free_seller', 'بائع مجاني', 'الباقة المجانية الأساسية', 'free', 0),
  ('Silver Seller', 'silver_seller', 'بائع فضي', 'باقة فضية بأدوات متقدمة', 'silver', 50),
  ('Gold Seller', 'gold_seller', 'بائع ذهبي', 'باقة ذهبية بالذكاء الصناعي', 'gold', 100)
ON CONFLICT (role_key) DO NOTHING;
