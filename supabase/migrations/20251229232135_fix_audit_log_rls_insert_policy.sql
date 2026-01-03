/*
  # إصلاح سياسات RLS لجدول b2f_status_audit_log
  
  ## المشكلة
  - الجدول فيه سياسة SELECT فقط
  - ال trigger يحاول يكتب لكن مافي سياسة INSERT
  
  ## الحل
  - إضافة سياسة INSERT للأدمن
*/

-- السماح للأدمن بإضافة سجلات audit
CREATE POLICY "Admins can insert audit log"
  ON b2f_status_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

-- تحديث ال trigger function ليستخدم security definer
-- حتى يشتغل حتى لو المستخدم مو أدمن
DROP FUNCTION IF EXISTS log_status_change() CASCADE;

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO b2f_status_audit_log (request_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء ال trigger
CREATE TRIGGER log_status_changes
  AFTER UPDATE OF status ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();
