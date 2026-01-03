/*
  # إضافة أعمدة admin_notes و updated_at لجدول investment_reservations

  ## التغييرات
  1. إضافة عمود admin_notes لتسجيل ملاحظات المسؤول
  2. إضافة عمود updated_at لتتبع وقت آخر تحديث
  
  ## الأعمدة الجديدة
  - admin_notes: نص لملاحظات المسؤول على الطلب
  - updated_at: وقت آخر تحديث للطلب
  
  ## الأمان
  - الأعمدة اختيارية ويمكن أن تكون NULL
  - updated_at يتم تحديثه تلقائياً عند أي تعديل
*/

-- Add admin_notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_reservations' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE investment_reservations
    ADD COLUMN admin_notes text;
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_reservations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE investment_reservations
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_investment_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_investment_reservations_updated_at_trigger
  ON investment_reservations;

-- Create trigger
CREATE TRIGGER update_investment_reservations_updated_at_trigger
  BEFORE UPDATE ON investment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_reservations_updated_at();
