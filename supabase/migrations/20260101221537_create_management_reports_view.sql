/*
  # إنشاء view لتقارير الإدارة مع التفاصيل
  
  ينشئ view يجمع بيانات التقارير مع معلومات المزرعة والإحصائيات
*/

-- إنشاء view لتقارير التوثيق
CREATE OR REPLACE VIEW management_reports_with_timeline AS
SELECT 
  r.id,
  r.farm_id,
  r.task_id,
  r.created_by_name,
  r.title,
  r.summary,
  r.selected_photos,
  r.report_type,
  r.priority,
  r.sent_at,
  r.viewed_by_admin,
  r.viewed_at,
  r.admin_notes,
  r.created_at,
  r.approved_by,
  r.approved_at,
  r.operation_id,
  r.status,
  r.sent_to_admin,
  f.name as farm_name,
  f.location as farm_location,
  -- عدد الصور
  COALESCE(jsonb_array_length(r.selected_photos), 0) as photos_count,
  -- Timeline events for this report
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'event_type', event_type,
        'actor_name', actor_name,
        'actor_role', actor_role,
        'description', description,
        'created_at', created_at,
        'metadata', metadata
      ) ORDER BY created_at
    )
    FROM unified_timeline
    WHERE report_id = r.id
  ) as timeline,
  -- عدد المستثمرين الذين تم إشعارهم (إذا كان التقرير مرتبط بعملية)
  CASE 
    WHEN r.operation_id IS NOT NULL THEN (
      SELECT COUNT(DISTINCT investor_id)
      FROM investor_operations
      WHERE farm_operation_id = r.operation_id
    )
    ELSE 0
  END as investors_notified_count
FROM management_reports r
LEFT JOIN b2f_farms f ON f.id = r.farm_id;

-- منح صلاحيات القراءة
GRANT SELECT ON management_reports_with_timeline TO authenticated;
GRANT SELECT ON management_reports_with_timeline TO anon;