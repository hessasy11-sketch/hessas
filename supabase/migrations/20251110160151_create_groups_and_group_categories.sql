/*
  # إنشاء جداول القروبات وإعدادات التصنيفات

  1. الجداول الجديدة
    - `groups`: جدول القروبات
      - `id` (uuid, primary key)
      - `name` (اسم القروب)
      - `description` (وصف القروب)
      - `owner_id` (مالك القروب)
      - `avatar_url` (صورة القروب)
      - `is_private` (قروب خاص أو عام)
      - `created_at` (تاريخ الإنشاء)
    
    - `group_members`: أعضاء القروبات
      - `id` (uuid, primary key)
      - `group_id` (القروب)
      - `user_id` (المستخدم)
      - `role` (دور: admin, moderator, member)
      - `joined_at` (تاريخ الانضمام)
    
    - `group_category_settings`: إعدادات تصنيفات كل قروب
      - `id` (uuid, primary key)
      - `group_id` (القروب)
      - `category_id` (التصنيف)
      - `is_enabled` (مفعل أو لا)
      - `sort_order` (ترتيب مخصص)

  2. التصنيفات
    - نسخ نفس تصنيفات المزادات العامة (الـ11 تصنيف)
    - تحت section = 'groups'
    - كل قروب يمكنه تفعيل/إخفاء أي تصنيف

  3. الأمان
    - RLS policies لحماية بيانات القروبات
    - فقط الأعضاء يمكنهم رؤية المحتوى
    - المشرفون فقط يمكنهم إدارة التصنيفات
*/

-- إنشاء جدول القروبات
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_url text,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول أعضاء القروبات
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- إنشاء جدول إعدادات تصنيفات القروبات
CREATE TABLE IF NOT EXISTS group_category_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES auction_categories(id) ON DELETE CASCADE NOT NULL,
  is_enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  UNIQUE(group_id, category_id)
);

-- إضافة تصنيفات القروبات (نفس تصنيفات المزادات العامة)
INSERT INTO auction_categories (name_ar, icon, color, section, sub_type, sort_order)
VALUES
  ('الخضروات', '🥕', '#10b981', 'groups', 'both', 1),
  ('الفواكه', '🍎', '#ef4444', 'groups', 'both', 2),
  ('الحبوب والبقوليات', '🌾', '#f59e0b', 'groups', 'both', 3),
  ('النخيل والتمور', '🌴', '#d97706', 'groups', 'both', 4),
  ('المواشي والأغنام', '🐑', '#8b5cf6', 'groups', 'both', 5),
  ('الدواجن والطيور', '🐔', '#eab308', 'groups', 'both', 6),
  ('الأسماك والمنتجات البحرية', '🐟', '#06b6d4', 'groups', 'both', 7),
  ('العسل ومنتجات النحل', '🍯', '#f59e0b', 'groups', 'both', 8),
  ('الزيوت الطبيعية', '🫒', '#84cc16', 'groups', 'both', 9),
  ('البذور والشتلات', '🌱', '#22c55e', 'groups', 'both', 10),
  ('الأسمدة والمعدات الزراعية', '🚜', '#6366f1', 'groups', 'both', 11)
ON CONFLICT DO NOTHING;

-- تفعيل RLS على جدول القروبات
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للقروبات
CREATE POLICY "الجميع يمكنهم رؤية القروبات العامة"
  ON groups FOR SELECT
  TO authenticated
  USING (NOT is_private);

CREATE POLICY "الأعضاء يمكنهم رؤية القروبات الخاصة"
  ON groups FOR SELECT
  TO authenticated
  USING (
    is_private AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "المستخدمون يمكنهم إنشاء قروبات"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "المالك يمكنه تحديث القروب"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "المالك يمكنه حذف القروب"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- تفعيل RLS على جدول أعضاء القروبات
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الأعضاء يمكنهم رؤية أعضاء القروب"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "المشرفون يمكنهم إضافة أعضاء"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'moderator')
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "المشرفون يمكنهم تحديث الأعضاء"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "المشرفون يمكنهم حذف الأعضاء"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin', 'moderator')
    )
  );

-- تفعيل RLS على جدول إعدادات التصنيفات
ALTER TABLE group_category_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الأعضاء يمكنهم رؤية إعدادات التصنيفات"
  ON group_category_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_category_settings.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "المشرفون يمكنهم إدارة التصنيفات"
  ON group_category_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_category_settings.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_category_settings.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'moderator')
    )
  );

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_category_settings_group ON group_category_settings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_category_settings_category ON group_category_settings(category_id);

-- إضافة تعليقات توضيحية
COMMENT ON TABLE groups IS 'جدول القروبات - كل قروب له مزاداته الخاصة المغلقة';
COMMENT ON TABLE group_members IS 'جدول أعضاء القروبات - يحدد من يمكنه الوصول لمزادات القروب';
COMMENT ON TABLE group_category_settings IS 'إعدادات التصنيفات لكل قروب - المشرف يمكنه تفعيل/إخفاء أي تصنيف';
