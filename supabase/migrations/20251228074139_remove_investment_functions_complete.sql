/*
  # حذف جميع Functions المتعلقة بنظام طلبات الاستثمار

  ## الحذف الشامل
  
  حذف جميع الدوال المتعلقة بـ:
  - العقود (contracts)
  - الشهادات (certificates)
  - الحجوزات (bookings/reservations)
  - التشغيل (operations)
  
  ## ملاحظات
  - حذف نهائي لجميع الدوال
  - سيتم حذف جميع ال triggers المرتبطة تلقائياً
*/

-- حذف دوال العقود
DROP FUNCTION IF EXISTS activate_contract_after_payment() CASCADE;
DROP FUNCTION IF EXISTS calculate_contract_end_date(timestamp with time zone, integer) CASCADE;
DROP FUNCTION IF EXISTS can_create_contract_from_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_b2f_contract_number() CASCADE;
DROP FUNCTION IF EXISTS generate_contract_number() CASCADE;
DROP FUNCTION IF EXISTS set_b2f_contract_number() CASCADE;
DROP FUNCTION IF EXISTS update_b2f_contracts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_contract_on_certificate_issue() CASCADE;
DROP FUNCTION IF EXISTS validate_contract_creation() CASCADE;

-- حذف دوال الشهادات
DROP FUNCTION IF EXISTS auto_generate_certificate_on_contract() CASCADE;
DROP FUNCTION IF EXISTS can_issue_certificate_for_contract(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_b2f_certificate_number() CASCADE;
DROP FUNCTION IF EXISTS generate_certificate_number() CASCADE;
DROP FUNCTION IF EXISTS update_b2f_certificates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS validate_certificate_issuance() CASCADE;

-- حذف دوال الحجوزات والطلبات
DROP FUNCTION IF EXISTS approve_investment_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_booking_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_investment_reservations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_needs_contract_after_verification() CASCADE;

-- حذف دوال التشغيل
DROP FUNCTION IF EXISTS calculate_operation_total_fee(numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS update_operation_update_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_operational_status_from_booking_status() CASCADE;

-- حذف دوال أخرى متعلقة
DROP FUNCTION IF EXISTS update_investment_opportunity_cards_updated_at() CASCADE;

-- تأكيد: تم حذف جميع الدوال المتعلقة بنظام طلبات الاستثمار
