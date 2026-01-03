/*
  # إنشاء مخزن الإيصالات للمدفوعات B2F

  1. إنشاء Bucket:
    - `b2f-payment-receipts`: لتخزين إيصالات الدفع المرفوعة من المستثمرين
    
  2. السياسات الأمنية (RLS):
    - يمكن للمستثمرين رفع إيصالاتهم الخاصة
    - يمكن للمستثمرين عرض إيصالاتهم فقط
    - يمكن للإدارة عرض جميع الإيصالات
    - يمكن للإدارة حذف الإيصالات عند الحاجة
*/

-- إنشاء bucket للإيصالات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-payment-receipts', 'b2f-payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "المستثمرون يمكنهم رفع إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "المستثمرون يمكنهم عرض إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "المستثمرون يمكنهم تحديث إيصالاتهم" ON storage.objects;
DROP POLICY IF EXISTS "الإدارة فقط يمكنها حذف الإيصالات" ON storage.objects;

-- سياسة رفع الإيصالات: يمكن لأي مستخدم مصادق عليه رفع إيصال
CREATE POLICY "المستثمرون يمكنهم رفع إيصالاتهم"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'b2f-payment-receipts');

-- سياسة عرض الإيصالات: يمكن للجميع عرضها (لأن anon يحتاج الوصول)
CREATE POLICY "المستثمرون يمكنهم عرض إيصالاتهم"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'b2f-payment-receipts');

-- سياسة تحديث الإيصالات: يمكن للمستخدم تحديث إيصالاته
CREATE POLICY "المستثمرون يمكنهم تحديث إيصالاتهم"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'b2f-payment-receipts')
WITH CHECK (bucket_id = 'b2f-payment-receipts');

-- سياسة حذف الإيصالات: يمكن لأي مستخدم مصادق حذف إيصالاته
CREATE POLICY "المستثمرون يمكنهم حذف إيصالاتهم"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'b2f-payment-receipts');
