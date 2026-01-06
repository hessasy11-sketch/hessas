# دليل اختبار لوحة المؤشرات العليا (Executive Pulse)

## 🧪 اختبارات القبول

### الاختبار 1: عرض البيانات الأساسية

#### الخطوات:
1. تسجيل الدخول كمدير عام
2. الذهاب إلى `/admin/operations-room/global`
3. التحقق من عرض 6 كروت

#### النتيجة المتوقعة:
```
✅ المزارع النشطة: عدد
✅ المزارع المتعثرة: عدد
✅ إجمالي المصروفات: مبلغ بالريال
✅ الحجوزات اليوم: عدد
✅ القرارات المعلقة: عدد
✅ معدل النشاط: عدد
✅ آخر 5 أحداث مهمة
```

---

### الاختبار 2: التحديث الفوري عند إنشاء قرار

#### الخطوات:
```sql
-- 1. افتح لوحة المؤشرات في متصفح
-- 2. لاحظ عدد القرارات المعلقة (مثلاً: 5)

-- 3. في نافذة SQL أخرى، أنشئ قرار جديد:
INSERT INTO decision_queue (
  decision_type,
  farm_id,
  priority,
  action_data,
  requested_by,
  status
) VALUES (
  'approve_expense',
  (SELECT id FROM b2f_farms LIMIT 1),
  'urgent',
  '{"amount": 1000, "description": "اختبار"}',
  (SELECT id FROM platform_staff WHERE role = 'super_admin' LIMIT 1),
  'pending'
);

-- 4. راقب اللوحة
```

#### النتيجة المتوقعة:
```
✅ عدد القرارات المعلقة يزيد بـ 1 تلقائياً
✅ بدون الحاجة لـ refresh الصفحة
✅ في أقل من ثانية واحدة
```

---

### الاختبار 3: التحديث عند الموافقة على قرار

#### الخطوات:
```sql
-- 1. لاحظ العدادات الحالية

-- 2. اعتمد قرار موجود:
SELECT approve_decision_b2f(
  (SELECT id FROM decision_queue WHERE status = 'pending' LIMIT 1),
  (SELECT id FROM platform_staff WHERE role = 'super_admin' LIMIT 1),
  'موافقة اختبار'
);

-- 3. راقب اللوحة
```

#### النتيجة المتوقعة:
```
✅ عدد القرارات المعلقة ينقص بـ 1
✅ إجمالي المصروفات يزيد (إذا كان مصروف)
✅ حدث جديد يظهر في Timeline
✅ كل شيء فوري بدون refresh
```

---

### الاختبار 4: التحديث عند اعتماد مصروف

#### الخطوات:
```sql
-- 1. لاحظ إجمالي المصروفات (30 يوم)

-- 2. أنشئ واعتمد مصروف:
INSERT INTO farm_expenses (
  farm_id,
  description,
  amount,
  category,
  requested_by,
  approval_status,
  approved_by,
  approved_at,
  expense_date
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'مصروف اختبار',
  3000,
  'maintenance',
  (SELECT id FROM platform_staff LIMIT 1),
  'approved',
  (SELECT id FROM platform_staff WHERE role = 'super_admin' LIMIT 1),
  now(),
  CURRENT_DATE
);

-- 3. راقب اللوحة
```

#### النتيجة المتوقعة:
```
✅ إجمالي المصروفات يزيد بـ 3000 ر.س
✅ التحديث فوري
✅ العدد دقيق
```

---

### الاختبار 5: Timeline الأحداث

#### الخطوات:
```sql
-- 1. لاحظ آخر 5 أحداث في Timeline

-- 2. نفذ عملية جديدة (أي عملية)

-- 3. راقب Timeline
```

#### النتيجة المتوقعة:
```
✅ الحدث الجديد يظهر في الأعلى
✅ الأحداث القديمة تنزل للأسفل
✅ يحتفظ بآخر 5 فقط
✅ معلومات كاملة لكل حدث:
   - نوع الإجراء
   - اسم المزرعة
   - اسم الموظف
   - النتيجة
   - الوقت النسبي
```

---

### الاختبار 6: التحديث الدوري (30 ثانية)

#### الخطوات:
1. افتح اللوحة
2. انتظر 30 ثانية
3. لاحظ مؤشر "آخر تحديث"

#### النتيجة المتوقعة:
```
✅ الوقت يتحدث كل 30 ثانية
✅ نقطة خضراء تنبض بجانب "تحديث تلقائي"
✅ البيانات تُحدّث حتى لو لم تتغير
```

---

### الاختبار 7: متابعة عدة عمليات متتالية

#### الخطوات:
```sql
-- نفذ هذه العمليات بسرعة:

-- 1. أنشئ قرار
INSERT INTO decision_queue (...) VALUES (...);

-- 2. اعتمد قرار آخر
SELECT approve_decision_b2f(...);

-- 3. أنشئ مصروف
INSERT INTO farm_expenses (...) VALUES (...);

-- 4. راقب اللوحة
```

#### النتيجة المتوقعة:
```
✅ جميع التغييرات تظهر فوراً
✅ لا تأخير أو تجميد
✅ الأرقام دقيقة
✅ Timeline يتحدث بشكل صحيح
```

---

## 🎯 معايير النجاح

### يعتبر النظام ناجحاً إذا:

1. ✅ **التحديث الفوري (<1 ثانية)**
   - أي تغيير في قاعدة البيانات يظهر فوراً
   - بدون refresh يدوي

2. ✅ **الدقة (100%)**
   - الأرقام المعروضة تطابق البيانات في قاعدة البيانات
   - لا أخطاء في الحسابات

3. ✅ **الأداء**
   - تحميل أولي: < 2 ثانية
   - تحديث فوري: < 1 ثانية
   - لا تأثير على باقي النظام

4. ✅ **الموثوقية**
   - يعمل مع عدة مستخدمين في نفس الوقت
   - لا أعطال أو أخطاء
   - Realtime subscriptions مستقرة

5. ✅ **التجربة البصرية**
   - تصميم واضح وجذاب
   - ألوان مميزة لكل مؤشر
   - Timeline سهل القراءة

---

## 🐛 حل المشاكل الشائعة

### المشكلة: البيانات لا تتحدث

#### الحل:
```sql
-- تحقق من تفعيل Realtime
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN (
  'b2f_farms',
  'decision_queue',
  'farm_expenses',
  'b2f_sales_requests',
  'executive_logs'
);

-- إذا لم تكن موجودة، نفذ:
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_farms;
ALTER PUBLICATION supabase_realtime ADD TABLE decision_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE farm_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE b2f_sales_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE executive_logs;
```

### المشكلة: الأرقام غير دقيقة

#### الحل:
```sql
-- اختبر الدالة مباشرة:
SELECT get_executive_pulse();

-- تحقق من البيانات الفعلية:
SELECT COUNT(*) FROM decision_queue WHERE status = 'pending';
SELECT COUNT(*) FROM b2f_farms WHERE operational_status = 'operational';
```

### المشكلة: التحديث بطيء

#### الحل:
```typescript
// تحقق من الـ subscriptions في console
// يجب أن ترى:
// ✓ executive-pulse-farms: SUBSCRIBED
// ✓ executive-pulse-decisions: SUBSCRIBED
// ✓ executive-pulse-expenses: SUBSCRIBED
// ✓ executive-pulse-requests: SUBSCRIBED
// ✓ executive-pulse-logs: SUBSCRIBED
```

---

## 📊 أمثلة SQL للاختبار السريع

### إنشاء بيانات اختبار:

```sql
-- قرار جديد
INSERT INTO decision_queue (
  decision_type, farm_id, priority, action_data, requested_by, status
) VALUES (
  'approve_expense',
  (SELECT id FROM b2f_farms LIMIT 1),
  'normal',
  '{"amount": 1500}',
  (SELECT id FROM platform_staff LIMIT 1),
  'pending'
);

-- مصروف جديد
INSERT INTO farm_expenses (
  farm_id, description, amount, category,
  approval_status, approved_by, approved_at
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'اختبار',
  2000,
  'maintenance',
  'approved',
  (SELECT id FROM platform_staff LIMIT 1),
  now()
);

-- حدث تنفيذي
INSERT INTO executive_logs (
  action_type, farm_id, performed_by, result, notes
) VALUES (
  'create_farm_operation',
  (SELECT id FROM b2f_farms LIMIT 1),
  (SELECT id FROM platform_staff LIMIT 1),
  'success',
  'عملية اختبار'
);
```

---

## ✅ Checklist النهائي

قبل إعلان النظام جاهز للإنتاج:

- [ ] جميع الكروت تعرض بيانات صحيحة
- [ ] التحديث الفوري يعمل في جميع الحالات
- [ ] Timeline يعرض آخر 5 أحداث
- [ ] الألوان والأيقونات واضحة
- [ ] لا أخطاء في console
- [ ] Realtime subscriptions نشطة
- [ ] الأداء ممتاز (<2 ثانية تحميل)
- [ ] يعمل مع عدة مستخدمين
- [ ] Build نجح بدون أخطاء
- [ ] التوثيق كامل

---

## 🎉 جاهز للإنتاج!

إذا نجحت جميع الاختبارات أعلاه، فالنظام جاهز للاستخدام في الإنتاج.

**المسار:** `/admin/operations-room/global`

**الصلاحيات المطلوبة:** Session Guard (أي موظف مصرح له)

**التحديث:** تلقائي فوري + دوري كل 30 ثانية
