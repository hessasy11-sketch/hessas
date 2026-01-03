/*
  # تنظيف الطلبات اليتيمة وإضافة CASCADE للحذف التلقائي
  
  1. التنظيف
    - حذف الطلبات (investment_reservations) التي لا تملك عرض استثماري مرتبط
    - هذه بيانات يتيمة لا فائدة منها
  
  2. إضافة القيود
    - إضافة Foreign Key Constraint بين investment_reservations و b2f_opportunities
    - عند حذف عرض استثماري → يتم حذف جميع الطلبات المرتبطة به تلقائياً
    - عند حذف مزرعة → يتم حذف العروض → ثم الطلبات (cascade chain)
  
  3. الأمان
    - يضمن عدم وجود طلبات يتيمة بدون عرض استثماري
    - يحافظ على نظافة قاعدة البيانات
*/

-- حذف الطلبات اليتيمة التي لا تملك عرض استثماري
DELETE FROM investment_reservations
WHERE opportunity_id NOT IN (SELECT id FROM b2f_opportunities);

-- إضافة Foreign Key Constraint مع CASCADE
ALTER TABLE investment_reservations
ADD CONSTRAINT investment_reservations_opportunity_id_fkey
FOREIGN KEY (opportunity_id)
REFERENCES b2f_opportunities(id)
ON DELETE CASCADE;