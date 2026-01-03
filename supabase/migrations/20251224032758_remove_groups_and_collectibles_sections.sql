/*
  # حذف أقسام القروبات والمقتنيات النادرة

  1. التغييرات
    - حذف جدول `groups` بالكامل
    - حذف أي categories متعلقة بـ collectibles أو groups
    - تنظيف البيانات المتعلقة بهذه الأقسام

  2. الأقسام المحذوفة
    - collectibles (المقتنيات النادرة)
    - groups (مزادات القروبات)
    - leader (قائد القروب)

  3. ملاحظات
    - سيتم الاحتفاظ بالأقسام: public, company, official فقط
    - جميع البيانات المتعلقة بالقروبات والمقتنيات سيتم حذفها نهائياً
*/

-- حذف جدول groups إن وجد
DROP TABLE IF EXISTS groups CASCADE;

-- حذف الفئات المتعلقة بـ collectibles و groups من جدول categories
DELETE FROM categories WHERE section IN ('collectibles', 'groups');

-- تنظيف أي مزادات قد تكون مرتبطة بهذه الأقسام (تحويلها إلى public)
UPDATE auctions 
SET section = 'public' 
WHERE section IN ('collectibles', 'groups', 'leader');
