/*
  # إضافة بيانات تجريبية لمركز توليد المهام - النسخة النهائية المصححة

  1. قوالب المهام: 11 قالب جاهز
  2. الفرق: 5 فرق منظمة
  3. الموظفين: 10 موظفين تجريبيين
*/

-- ====================================
-- 1. إنشاء فرق العمل
-- ====================================

INSERT INTO staff_teams (id, name, description, department, is_active)
VALUES 
  (gen_random_uuid(), 'فريق إدارة المزادات', 'فريق مختص بمراجعة والموافقة على المزادات وإدارة عمليات البيع', 'B2B', true),
  (gen_random_uuid(), 'فريق إدارة المزارع والاستثمار', 'فريق مسؤول عن إدارة المزارع والفرص الاستثمارية وخدمة المستثمرين', 'B2F', true),
  (gen_random_uuid(), 'فريق المالية والمحاسبة', 'فريق مسؤول عن مراجعة الإيصالات والموافقات المالية', 'Finance', true),
  (gen_random_uuid(), 'فريق خدمة العملاء والدعم', 'فريق مسؤول عن الرد على استفسارات العملاء وحل المشاكل', 'Support', true),
  (gen_random_uuid(), 'فريق العمليات الميدانية', 'فريق مسؤول عن العمليات الزراعية والإشراف على المزارع', 'B2F', true)
ON CONFLICT DO NOTHING;

-- ====================================
-- 2. إنشاء قوالب المهام
-- ====================================

INSERT INTO task_templates (name, description, board, section, requires_proof, requires_approval, priority, estimated_duration_minutes, checklist_items, is_active)
VALUES 
  ('مراجعة مزاد جديد', 'مراجعة تفاصيل المزاد والتحقق من صحة المعلومات والصور قبل النشر', 'b2b', 'auctions', false, true, 'high', 120, ARRAY['التحقق من معلومات البائع','مراجعة صور المنتج وجودتها','التأكد من السعر المنطقي','التحقق من التصنيف الصحيح','مراجعة وصف المزاد','الموافقة أو الرفض مع السبب'], true),
  ('متابعة مزاد منتهي', 'التواصل مع الفائز والبائع لإتمام الصفقة وتأكيد التسليم', 'b2b', 'auctions', true, false, 'medium', 60, ARRAY['التواصل مع الفائز بالمزاد','تأكيد استلام الدفعة','تأكيد تسليم المنتج','أخذ تقييم من الطرفين','إغلاق المزاد'], true),
  ('حل مشكلة مزاد', 'التعامل مع الشكاوى أو المشاكل في المزاد', 'b2b', 'auctions', true, true, 'urgent', 180, ARRAY['قراءة تفاصيل المشكلة','التواصل مع الأطراف','جمع الأدلة','اقتراح حل','تنفيذ الحل','متابعة رضا الأطراف'], true),
  ('إضافة فرصة استثمارية جديدة', 'إضافة فرصة استثمار جديدة مع كل التفاصيل والصور والأسعار', 'b2f', 'opportunities', true, true, 'high', 180, ARRAY['تجهيز معلومات المزرعة','تصوير الموقع والأشجار','تحديد السعر والعائد المتوقع','كتابة وصف تفصيلي','رفع الصور','نشر الفرصة'], true),
  ('مراجعة طلب استثمار', 'مراجعة طلب المستثمر والتحقق من الإيصال المالي قبل الموافقة', 'b2f', 'requests', false, true, 'urgent', 60, ARRAY['مراجعة معلومات المستثمر','التحقق من الإيصال المالي','التأكد من توفر الفرصة','التحقق من المبلغ','الموافقة أو الرفض'], true),
  ('إنشاء عقد استثمار', 'إنشاء عقد رسمي للمستثمر بعد الموافقة على طلب الاستثمار', 'b2f', 'contracts', false, true, 'urgent', 120, ARRAY['جمع بيانات المستثمر الكاملة','تجهيز بنود العقد','مراجعة قانونية','إصدار العقد','إرسال نسخة للمستثمر'], true),
  ('زيارة ميدانية للمزرعة', 'القيام بجولة تفقدية للمزرعة وتصوير الأشجار وحالتها', 'operations', 'field_visits', true, true, 'high', 240, ARRAY['التحضير للزيارة','الوصول للمزرعة','تفقد الأشجار','التقاط الصور والفيديو','كتابة تقرير مفصل','رفع التحديثات للنظام'], true),
  ('مراجعة إيصال دفع', 'التحقق من صحة إيصال الدفع المرفق من العميل', 'general', 'finance', false, true, 'high', 30, ARRAY['فتح الإيصال','التحقق من المبلغ','التحقق من التاريخ','التأكد من رقم الحساب','مطابقة البيانات','الموافقة أو الرفض'], true),
  ('تدقيق حساب مستثمر', 'مراجعة كاملة لحساب المستثمر ومعاملاته المالية', 'b2f', 'finance', false, true, 'medium', 120, ARRAY['جلب سجل المعاملات','التحقق من المدفوعات','مراجعة العقود','التأكد من العوائد','إعداد تقرير تدقيق'], true),
  ('الرد على استفسار عميل', 'التعامل مع استفسار أو شكوى عميل وحلها', 'general', 'support', false, false, 'medium', 60, ARRAY['قراءة الاستفسار بعناية','البحث عن الحل','الرد على العميل','متابعة رضا العميل','إغلاق التذكرة'], true),
  ('معالجة شكوى عاجلة', 'التعامل مع شكوى عاجلة تحتاج حل فوري', 'general', 'support', true, true, 'urgent', 30, ARRAY['قراءة الشكوى فوراً','التواصل مع العميل','اتخاذ إجراء فوري','متابعة الحل','الحصول على تأكيد من العميل'], true)
ON CONFLICT DO NOTHING;

-- ====================================
-- 3. إنشاء موظفين تجريبيين
-- ====================================

DO $$
DECLARE
  v_gm_id uuid := '50ff70ee-db37-4bcd-b1ef-11d4fa05dfba';
  v_auctions_pack_id uuid;
  v_farms_pack_id uuid;
  v_finance_pack_id uuid;
  v_support_pack_id uuid;
BEGIN
  UPDATE staff_teams SET team_leader_id = v_gm_id;
  
  SELECT id INTO v_auctions_pack_id FROM permission_packs WHERE name = 'مدير المزادات الرئيسي' LIMIT 1;
  SELECT id INTO v_farms_pack_id FROM permission_packs WHERE name = 'مدير المزارع' LIMIT 1;
  SELECT id INTO v_finance_pack_id FROM permission_packs WHERE name = 'محاسب' LIMIT 1;
  SELECT id INTO v_support_pack_id FROM permission_packs WHERE name = 'موظف خدمة العملاء' LIMIT 1;

  INSERT INTO platform_staff (staff_code, full_name, phone_number, pack_id, reports_to_staff_id, role, department, job_title, is_active)
  VALUES 
    ('AUC-001', 'أحمد محمد العتيبي', '0501234567', v_auctions_pack_id, v_gm_id, 'manager', 'B2B', 'مدير المزادات', true),
    ('AUC-002', 'سارة خالد الشمري', '0501234568', v_auctions_pack_id, v_gm_id, 'agent', 'B2B', 'موظفة مراجعة مزادات', true),
    ('FARM-001', 'عبدالله سعد القحطاني', '0501234569', v_farms_pack_id, v_gm_id, 'manager', 'B2F', 'مدير المزارع والاستثمار', true),
    ('FARM-002', 'نورة علي المطيري', '0501234570', v_farms_pack_id, v_gm_id, 'agent', 'B2F', 'موظفة فرص استثمارية', true),
    ('FIN-001', 'فهد عبدالعزيز الدوسري', '0501234571', v_finance_pack_id, v_gm_id, 'finance', 'Finance', 'محاسب رئيسي', true),
    ('FIN-002', 'ريم ناصر الحربي', '0501234572', v_finance_pack_id, v_gm_id, 'finance', 'Finance', 'محاسبة', true),
    ('SUP-001', 'عمر فيصل الغامدي', '0501234573', v_support_pack_id, v_gm_id, 'support', 'Support', 'موظف خدمة عملاء', true),
    ('SUP-002', 'مها راشد الزهراني', '0501234574', v_support_pack_id, v_gm_id, 'support', 'Support', 'موظفة دعم', true),
    ('OPS-001', 'خالد يوسف الشهري', '0501234575', v_farms_pack_id, v_gm_id, 'operations', 'B2F', 'مشرف العمليات الميدانية', true),
    ('OPS-002', 'سلطان حمد القرني', '0501234576', v_farms_pack_id, v_gm_id, 'operations', 'B2F', 'فني زراعي', true)
  ON CONFLICT (staff_code) DO NOTHING;

  -- ربط الموظفين بفرقهم
  INSERT INTO team_members (team_id, staff_id, role_in_team)
  SELECT (SELECT id FROM staff_teams WHERE name = 'فريق إدارة المزادات'), id, CASE WHEN staff_code = 'AUC-001' THEN 'قائد الفريق' ELSE 'عضو' END FROM platform_staff WHERE staff_code IN ('AUC-001', 'AUC-002')
  ON CONFLICT DO NOTHING;

  INSERT INTO team_members (team_id, staff_id, role_in_team)
  SELECT (SELECT id FROM staff_teams WHERE name = 'فريق إدارة المزارع والاستثمار'), id, CASE WHEN staff_code = 'FARM-001' THEN 'قائد الفريق' ELSE 'عضو' END FROM platform_staff WHERE staff_code IN ('FARM-001', 'FARM-002')
  ON CONFLICT DO NOTHING;

  INSERT INTO team_members (team_id, staff_id, role_in_team)
  SELECT (SELECT id FROM staff_teams WHERE name = 'فريق المالية والمحاسبة'), id, CASE WHEN staff_code = 'FIN-001' THEN 'قائد الفريق' ELSE 'عضو' END FROM platform_staff WHERE staff_code IN ('FIN-001', 'FIN-002')
  ON CONFLICT DO NOTHING;

  INSERT INTO team_members (team_id, staff_id, role_in_team)
  SELECT (SELECT id FROM staff_teams WHERE name = 'فريق خدمة العملاء والدعم'), id, 'عضو' FROM platform_staff WHERE staff_code IN ('SUP-001', 'SUP-002')
  ON CONFLICT DO NOTHING;

  INSERT INTO team_members (team_id, staff_id, role_in_team)
  SELECT (SELECT id FROM staff_teams WHERE name = 'فريق العمليات الميدانية'), id, CASE WHEN staff_code = 'OPS-001' THEN 'مشرف' ELSE 'فني' END FROM platform_staff WHERE staff_code IN ('OPS-001', 'OPS-002')
  ON CONFLICT DO NOTHING;

END $$;
