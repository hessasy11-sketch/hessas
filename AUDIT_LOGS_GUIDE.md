# دليل نظام Audit Logs الشامل

## نظرة عامة

نظام تدقيق شامل يسجل ويراقب جميع الأنشطة المتعلقة بـ:
- ✅ محاولات الدخول (ناجحة وفاشلة)
- ✅ عمليات إدارة QR Code
- ✅ عمليات إدارة PIN
- ✅ نوع الدخول (كاميرا/رفع صورة)
- ✅ الأجهزة المستخدمة
- ✅ IP Address
- ✅ التوجيه إلى المسارات
- ✅ أسباب الفشل

---

## 1. البنية التحتية

### 1.1 الجداول

#### جدول `staff_access_log`

سجل كامل لجميع محاولات الدخول:

```sql
CREATE TABLE staff_access_log (
  id uuid PRIMARY KEY,
  staff_id uuid,
  device_id uuid,
  device_fingerprint text,
  access_method text,  -- camera_scan/image_upload
  is_new_device boolean,
  requires_pin boolean,
  pin_verified boolean,
  success boolean,
  ip_address text,
  user_agent text,
  location_info jsonb,
  redirect_route text,  -- ✨ جديد: المسار الذي تم التوجيه إليه
  failure_reason text,  -- ✨ جديد: سبب الفشل
  created_at timestamptz
);
```

**ما يُسجَّل:**
- كل محاولة دخول (ناجحة أو فاشلة)
- طريقة الدخول (مسح بالكاميرا أو رفع صورة)
- هل الجهاز جديد؟
- هل يتطلب PIN؟
- هل تم التحقق من PIN؟
- IP Address
- User Agent
- المسار الذي تم التوجيه إليه
- سبب الفشل (إن وجد)

#### جدول `admin_operations_audit`

سجل العمليات الإدارية على QR وPIN:

```sql
CREATE TABLE admin_operations_audit (
  id uuid PRIMARY KEY,
  admin_staff_id uuid,  -- من قام بالعملية
  target_staff_id uuid,  -- الموظف المستهدف
  operation_type text CHECK (operation_type IN (
    'generate_qr',
    'revoke_qr',
    'activate_qr',
    'deactivate_qr',
    'set_pin',
    'change_pin',
    'remove_pin',
    'reset_pin_attempts',
    'trust_device',
    'revoke_device',
    'create_staff',
    'update_staff',
    'delete_staff'
  )),
  operation_details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz
);
```

**ما يُسجَّل:**
- من قام بالعملية (Admin/Super Admin)
- على من تمت العملية (الموظف المستهدف)
- نوع العملية (توليد QR، تعيين PIN، إلخ)
- تفاصيل العملية (JSON)
- IP Address
- User Agent
- وقت العملية

---

## 2. الدوال

### 2.1 دالة تسجيل عملية إدارية

```sql
SELECT log_admin_operation(
  p_admin_staff_id => 'uuid',
  p_target_staff_id => 'uuid',
  p_operation_type => 'generate_qr',
  p_operation_details => '{"token_prefix": "STAFF_XYZ..."}'::jsonb
);
```

**متى تُستدعى:**
- عند توليد QR جديد
- عند إيقاف/تفعيل QR
- عند تعيين/تغيير/إلغاء PIN
- عند إعادة تعيين محاولات PIN
- عند الوثوق بجهاز/إلغاء جهاز

### 2.2 دالة جلب كل السجلات

```sql
SELECT * FROM get_all_audit_logs(
  p_limit => 100,
  p_offset => 0
);
```

**ما تُرجع:**
- سجلات الدخول + العمليات الإدارية (مدمجة)
- مرتبة من الأحدث إلى الأقدم
- معلومات كاملة عن كل سجل

**الأعمدة المُرجعة:**
```typescript
{
  log_id: uuid,
  log_type: 'access' | 'operation',
  log_timestamp: timestamptz,
  staff_id: uuid,
  staff_name: string,
  staff_role: string,
  operation: string,  // "مسح بالكاميرا"، "توليد باركود"، إلخ
  details: jsonb,
  success: boolean,
  device_info: jsonb,
  ip_address: string
}
```

### 2.3 دالة جلب نشاط موظف محدد

```sql
SELECT * FROM get_staff_activity(
  p_staff_id => 'uuid',
  p_days => 30
);
```

**الاستخدام:**
- عرض كل نشاط موظف معين
- آخر 30 يوم (افتراضياً)
- يشمل: دخوله + العمليات التي تمت عليه

### 2.4 دالة المحاولات الأخيرة

```sql
SELECT * FROM get_recent_access_attempts(
  p_minutes => 60,
  p_failed_only => false
);
```

**الاستخدام:**
- مراقبة فورية
- الـ 60 دقيقة الأخيرة
- إظهار المحاولات الفاشلة فقط (اختياري)

### 2.5 دالة الإحصائيات

```sql
SELECT get_access_statistics(p_days => 7);
```

**ما تُرجع:**
```json
{
  "total_attempts": 150,
  "successful_attempts": 142,
  "failed_attempts": 8,
  "camera_scans": 120,
  "image_uploads": 30,
  "new_devices": 5,
  "pin_required": 60,
  "pin_verified": 58,
  "unique_staff": 25
}
```

---

## 3. ما يُسجَّل تلقائياً

### 3.1 محاولات الدخول

#### دخول ناجح:
```javascript
{
  staff_id: "uuid",
  access_method: "camera_scan",
  is_new_device: false,
  requires_pin: true,
  pin_verified: true,
  success: true,
  redirect_route: "/admin/b2f",
  ip_address: "192.168.1.100",
  device_fingerprint: "xyz123...",
  created_at: "2026-01-03T10:30:00Z"
}
```

#### دخول فاشل:
```javascript
{
  staff_id: "uuid",
  access_method: "image_upload",
  is_new_device: true,
  requires_pin: true,
  pin_verified: false,
  success: false,
  failure_reason: "PIN غير صحيح",
  ip_address: "192.168.1.101",
  created_at: "2026-01-03T10:35:00Z"
}
```

### 3.2 العمليات الإدارية

#### توليد QR:
```javascript
{
  admin_staff_id: "admin_uuid",
  target_staff_id: "staff_uuid",
  operation_type: "generate_qr",
  operation_details: {
    "token_prefix": "STAFF_XYZ..."
  },
  created_at: "2026-01-03T09:00:00Z"
}
```

#### تعيين PIN:
```javascript
{
  admin_staff_id: "admin_uuid",
  target_staff_id: "staff_uuid",
  operation_type: "set_pin",
  operation_details: {
    "requires_pin": true
  },
  created_at: "2026-01-03T09:05:00Z"
}
```

#### إيقاف QR:
```javascript
{
  admin_staff_id: "admin_uuid",
  target_staff_id: "staff_uuid",
  operation_type: "deactivate_qr",
  operation_details: {
    "new_status": false
  },
  created_at: "2026-01-03T14:20:00Z"
}
```

---

## 4. واجهة الاستخدام

### 4.1 الموقع في المنصة

```
/hq → الهيكلة والصلاحيات → نشاط الدخول
```

### 4.2 المكونات

#### إحصائيات سريعة:
- إجمالي المحاولات (ناجح/فاشل)
- طرق الدخول (كاميرا/رفع صورة)
- أجهزة جديدة تحتاج مراجعة
- عدد الموظفين النشطين

#### الفلاتر:
- **الكل**: عرض جميع السجلات
- **دخول**: عرض محاولات الدخول فقط
- **عمليات**: عرض العمليات الإدارية فقط

#### البحث:
- بحث بالاسم
- بحث بنوع العملية

#### عرض السجلات:
كل سجل يحتوي على:
- أيقونة تدل على نوع العملية
- اسم الموظف ودوره
- نوع العملية
- الوقت (بشكل نسبي: "منذ 5 دقائق")
- معلومات إضافية:
  - IP Address
  - سبب الفشل (إن وجد)
  - من قام بالعملية (للعمليات الإدارية)
  - المسار المُوجَّه إليه

---

## 5. سيناريوهات الاستخدام

### سيناريو 1: مراقبة المحاولات الفاشلة

```
1. المدير العام يدخل على "نشاط الدخول"
2. يختار فلتر "دخول"
3. يرى محاولة فاشلة لموظف
4. يفتح التفاصيل:
   - السبب: "PIN غير صحيح"
   - عدد المحاولات: 3
   - الحساب مُقفل حتى: 14:30
5. يتواصل مع الموظف لإعادة تعيين PIN
```

### سيناريو 2: كشف أجهزة جديدة مشبوهة

```
1. المدير العام يرى تنبيه "5 أجهزة جديدة"
2. يدخل على "نشاط الدخول"
3. يرى سجلات بـ "جهاز جديد"
4. يتحقق من:
   - اسم الموظف
   - IP Address
   - وقت الدخول
   - نوع الجهاز
5. إذا مشبوه → يوقف QR الموظف فوراً
```

### سيناريو 3: تدقيق عملية إدارية

```
1. موظف يشكو أن QR الخاص به تم إيقافه
2. المدير العام يدخل على "نشاط الدخول"
3. يبحث عن اسم الموظف
4. يرى سجل "إيقاف باركود"
5. يرى من قام بالعملية ومتى
6. يتخذ الإجراء المناسب
```

### سيناريو 4: تحليل طرق الدخول

```
1. المدير العام يريد معرفة:
   - كم موظف يدخل بالكاميرا؟
   - كم موظف يدخل برفع الصورة؟
2. يدخل على "نشاط الدخول"
3. يرى الإحصائيات:
   - 120 كاميرا / 30 رفع صورة
4. يقرر توفير أجهزة بكاميرا للموظفين
```

---

## 6. أمثلة SQL

### مثال 1: جلب آخر 10 محاولات دخول فاشلة

```sql
SELECT
  staff_name,
  operation,
  details->>'failure_reason' as failure_reason,
  log_timestamp,
  ip_address
FROM get_all_audit_logs(100, 0)
WHERE log_type = 'access'
AND success = false
LIMIT 10;
```

### مثال 2: جلب كل عمليات admin معين

```sql
SELECT
  target_staff_id,
  target_staff_name,
  operation_type,
  operation_details,
  created_at
FROM admin_operations_audit
WHERE admin_staff_id = 'admin_uuid'
ORDER BY created_at DESC;
```

### مثال 3: عدد الأجهزة الجديدة اليوم

```sql
SELECT COUNT(*)
FROM staff_access_log
WHERE is_new_device = true
AND created_at >= CURRENT_DATE;
```

### مثال 4: موظفون لم يدخلوا منذ أسبوع

```sql
SELECT DISTINCT
  ps.id,
  ps.full_name,
  MAX(sal.created_at) as last_access
FROM platform_staff ps
LEFT JOIN staff_access_log sal ON ps.id = sal.staff_id
GROUP BY ps.id, ps.full_name
HAVING MAX(sal.created_at) < now() - interval '7 days'
OR MAX(sal.created_at) IS NULL;
```

---

## 7. الأمان والصلاحيات

### 7.1 RLS Policies

#### staff_access_log:
```sql
-- الموظف يرى سجله فقط
CREATE POLICY "Staff can view own access log"
  ON staff_access_log FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM platform_staff WHERE user_id = auth.uid()
    )
  );

-- Admin يرى كل السجلات
CREATE POLICY "Admins can view all access logs"
  ON staff_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'super_admin')
    )
  );
```

#### admin_operations_audit:
```sql
-- فقط platform_owner وsuper_admin يمكنهم القراءة
CREATE POLICY "Platform owner can view all operations"
  ON admin_operations_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'super_admin')
    )
  );
```

### 7.2 التشفير

- PIN: bcrypt مع salt
- QR Token: base64 encoded random bytes
- Device Fingerprint: hash آمن
- IP Address: نص عادي (للمراقبة)

---

## 8. Performance

### 8.1 Indexes

```sql
-- لتسريع الاستعلامات
CREATE INDEX idx_staff_access_log_staff_id ON staff_access_log(staff_id);
CREATE INDEX idx_staff_access_log_created_at ON staff_access_log(created_at DESC);
CREATE INDEX idx_staff_access_log_success ON staff_access_log(success);
CREATE INDEX idx_staff_access_log_is_new_device ON staff_access_log(is_new_device) WHERE is_new_device = true;

CREATE INDEX idx_admin_operations_audit_admin_staff_id ON admin_operations_audit(admin_staff_id);
CREATE INDEX idx_admin_operations_audit_target_staff_id ON admin_operations_audit(target_staff_id);
CREATE INDEX idx_admin_operations_audit_created_at ON admin_operations_audit(created_at DESC);
```

### 8.2 Auto-refresh

المكون `AuditLogsView` يُحدِّث البيانات تلقائياً كل 30 ثانية:

```typescript
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 9. التوسع المستقبلي

### أفكار للتطوير:

1. **Alerts & Notifications:**
   - تنبيه فوري عند محاولة فاشلة
   - تنبيه عند جهاز جديد
   - تنبيه عند عدد محاولات فاشلة > 5

2. **Advanced Analytics:**
   - رسوم بيانية لتحليل الدخول
   - أوقات الذروة
   - توزيع جغرافي (IP → Location)

3. **Export:**
   - تصدير السجلات إلى CSV
   - تصدير تقرير PDF

4. **Retention Policy:**
   - حذف سجلات أقدم من 90 يوم تلقائياً
   - أرشفة السجلات القديمة

5. **AI Analysis:**
   - كشف الأنماط الغريبة
   - التنبؤ بمحاولات الاختراق
   - توصيات أمنية

---

## 10. Troubleshooting

### مشكلة: لا تظهر السجلات

```sql
-- تحقق من الصلاحيات
SELECT * FROM platform_staff WHERE user_id = auth.uid();
-- يجب أن يكون role = 'platform_owner' أو 'super_admin'

-- تحقق من وجود سجلات
SELECT COUNT(*) FROM staff_access_log;
SELECT COUNT(*) FROM admin_operations_audit;
```

### مشكلة: السجلات لا تُحدَّث

```typescript
// تحقق من console
console.log('Loading audit logs...');

// تحقق من RPC call
const { data, error } = await supabase.rpc('get_all_audit_logs');
if (error) console.error(error);
```

### مشكلة: الإحصائيات خاطئة

```sql
-- أعد حساب الإحصائيات يدوياً
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed
FROM staff_access_log
WHERE created_at >= now() - interval '7 days';
```

---

## خلاصة

نظام Audit Logs شامل يُسجِّل كل شيء:

✅ **محاولات الدخول:**
- ناجحة وفاشلة
- نوع الدخول (كاميرا/رفع صورة)
- أجهزة جديدة
- PIN required/verified

✅ **العمليات الإدارية:**
- توليد/إيقاف/تفعيل QR
- تعيين/تغيير/إلغاء PIN
- إدارة الأجهزة

✅ **معلومات مفصلة:**
- IP Address
- User Agent
- Device Info
- Failure Reasons
- Redirect Routes

✅ **واجهة قوية:**
- إحصائيات فورية
- فلاتر متقدمة
- بحث سريع
- تحديث تلقائي

✅ **أمان عالي:**
- RLS policies محكمة
- فقط platform_owner/super_admin
- تشفير البيانات الحساسة

النظام جاهز للإنتاج ويوفر مراقبة كاملة لكل الأنشطة!
