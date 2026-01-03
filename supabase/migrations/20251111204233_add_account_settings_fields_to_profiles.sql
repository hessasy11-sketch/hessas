/*
  # إضافة حقول إعدادات الحساب لجدول الملفات الشخصية

  1. الحقول الجديدة
    - `city` (text) - المدينة/المنطقة
    - `bio` (text) - الوصف البسيط
    - `show_phone` (boolean) - إظهار رقم الهاتف
    - `phone_verified` (boolean) - توثيق الجوال
    - `id_verified` (boolean) - توثيق الهوية
    - `rating` (numeric) - التقييم من 0 إلى 5
    - `updated_at` (timestamptz) - آخر تحديث

  2. القيم الافتراضية
    - show_phone: false (مخفي افتراضياً)
    - phone_verified: false
    - id_verified: false
    - rating: 0.0
    - updated_at: now()

  3. الملاحظات
    - جميع الحقول اختيارية ما عدا القيم الافتراضية
    - التقييم محدود بين 0 و 5
*/

DO $$ 
BEGIN
  -- إضافة حقل المدينة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  -- إضافة حقل الوصف
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  -- إضافة حقل إظهار الهاتف
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'show_phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_phone boolean DEFAULT false;
  END IF;

  -- إضافة حقل توثيق الجوال
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  -- إضافة حقل توثيق الهوية
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'id_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN id_verified boolean DEFAULT false;
  END IF;

  -- إضافة حقل التقييم
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN rating numeric(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5);
  END IF;

  -- إضافة حقل آخر تحديث
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);
