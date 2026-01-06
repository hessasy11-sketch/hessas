/*
  # إزالة Trigger القديم لولادة المزرعة
  
  ## السبب
  الـ trigger القديم (auto_birth_farm_on_contract) يبحث عن عمود contract_issued
  الذي لا يوجد في الـ schema الحالي
  
  ## الحل
  إزالة الـ trigger القديم والـ function القديمة
  والاعتماد على النظام الجديد (trigger_farm_birth_event)
*/

-- إزالة Trigger القديم
DROP TRIGGER IF EXISTS auto_birth_farm_on_contract_trigger ON b2f_contracts;

-- إزالة Function القديمة
DROP FUNCTION IF EXISTS auto_birth_farm_on_contract();

-- إزالة جدول fc_birth_records القديم إذا كان موجوداً
DROP TABLE IF EXISTS fc_birth_records CASCADE;

-- إزالة function birth_operational_farm القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS birth_operational_farm(uuid, uuid, uuid, text);
