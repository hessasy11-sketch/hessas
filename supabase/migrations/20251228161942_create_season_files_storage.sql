/*
  # Storage للملفات الموسمية
  
  1. إنشاء Bucket
    - b2f-season-files: لتخزين صور ومستندات المواسم
  
  2. Security
    - سياسات رفع للإدارة
    - سياسات قراءة للمستثمرين
*/

-- إنشاء Bucket للملفات الموسمية
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-season-files', 'b2f-season-files', true)
ON CONFLICT (id) DO NOTHING;

-- سياسة رفع الملفات (للإدارة)
CREATE POLICY "Admins can upload season files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'b2f-season-files');

-- سياسة تحديث الملفات (للإدارة)
CREATE POLICY "Admins can update season files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'b2f-season-files')
WITH CHECK (bucket_id = 'b2f-season-files');

-- سياسة حذف الملفات (للإدارة)
CREATE POLICY "Admins can delete season files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'b2f-season-files');

-- سياسة قراءة الملفات (عامة)
CREATE POLICY "Anyone can view season files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'b2f-season-files');
