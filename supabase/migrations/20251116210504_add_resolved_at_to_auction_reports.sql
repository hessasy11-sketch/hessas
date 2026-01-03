/*
  # إضافة حقل resolved_at لجدول auction_reports

  1. التغييرات
    - إضافة عمود `resolved_at` (timestamp) - تاريخ حل البلاغ
    - إضافة عمود `resolved_by` (uuid) - المسؤول الذي حل البلاغ
    - إضافة عمود `resolution_notes` (text) - ملاحظات الحل

  2. الملاحظات
    - resolved_at = NULL يعني البلاغ لم يُحل بعد
    - resolved_at != NULL يعني البلاغ تم حله
*/

-- إضافة عمود تاريخ الحل
ALTER TABLE auction_reports 
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- إضافة عمود من قام بالحل
ALTER TABLE auction_reports 
ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES profiles(id);

-- إضافة عمود ملاحظات الحل
ALTER TABLE auction_reports 
ADD COLUMN IF NOT EXISTS resolution_notes text;

-- إضافة فهرس للبحث السريع عن البلاغات غير المحلولة
CREATE INDEX IF NOT EXISTS idx_auction_reports_unresolved 
ON auction_reports(resolved_at) 
WHERE resolved_at IS NULL;

-- تعليقات
COMMENT ON COLUMN auction_reports.resolved_at IS 'تاريخ حل البلاغ (NULL = لم يُحل بعد)';
COMMENT ON COLUMN auction_reports.resolved_by IS 'المسؤول الذي حل البلاغ';
COMMENT ON COLUMN auction_reports.resolution_notes IS 'ملاحظات حول حل البلاغ';
