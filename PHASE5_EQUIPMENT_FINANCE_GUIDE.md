# المرحلة 5: المعدات + الحاسبة التشغيلية (Lightweight)

**التاريخ:** 2026-01-05
**الحالة:** ✅ مكتمل 100%

---

## الملخص

المرحلة 5 تضيف نظامين بسيطين وفعّالين لإدارة المزارع:
1. **المعدات:** تتبع معدات المزرعة وحالتها التشغيلية
2. **الحاسبة التشغيلية:** تسجيل بسيط للمدخولات والمصروفات

---

## 📍 المسار

```
/admin/b2f/farms/:farmId → Tab: المعدات
/admin/b2f/farms/:farmId → Tab: الحاسبة
```

---

## 🗄️ Database Schema

### 1. `farm_equipment` - معدات المزرعة

```sql
CREATE TABLE farm_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'working'
    CHECK (status IN ('working', 'maintenance', 'stopped')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**الحالات:**
- `working` - تعمل
- `maintenance` - صيانة
- `stopped` - متوقفة

### 2. `farm_financial_entries` - المدخولات والمصروفات

```sql
CREATE TABLE farm_financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('income', 'expense')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**الأنواع:**
- `income` - مدخول
- `expense` - مصروف

---

## 🔧 RPC Functions

### 1. get_farm_equipment_summary(p_farm_id uuid)

يُرجع إحصائيات المعدات:

```json
{
  "total": 10,
  "working": 7,
  "maintenance": 2,
  "stopped": 1
}
```

**الاستخدام:**
```typescript
const { data } = await supabase.rpc('get_farm_equipment_summary', {
  p_farm_id: farmId
});
```

### 2. get_farm_financial_summary(p_farm_id uuid)

يُرجع ملخص مالي:

```json
{
  "total_income": 50000.00,
  "total_expense": 35000.00,
  "balance": 15000.00,
  "income_count": 5,
  "expense_count": 8
}
```

**الاستخدام:**
```typescript
const { data } = await supabase.rpc('get_farm_financial_summary', {
  p_farm_id: farmId
});
```

---

## 🔒 Row Level Security (RLS)

### معدات المزرعة

**القراءة:**
- أعضاء فريق المزرعة
- الإداريون

**الكتابة (INSERT/UPDATE/DELETE):**
- مدير المزرعة فقط
- الإداريون

### العمليات المالية

**القراءة:**
- أعضاء فريق المزرعة
- الإداريون

**الكتابة (INSERT/UPDATE/DELETE):**
- مدير المزرعة فقط
- الإداريون

---

## 💻 Frontend Components

### 1. EquipmentView.tsx

**الموقع:** `src/components/B2F/farmCommand/EquipmentView.tsx`

**الميزات:**
- ✅ عرض قائمة المعدات
- ✅ إضافة معدة جديدة
- ✅ تعديل معدة موجودة
- ✅ حذف معدة
- ✅ تغيير حالة المعدة (تعمل/صيانة/متوقفة)
- ✅ إحصائيات real-time

**Props:**
```typescript
interface EquipmentViewProps {
  farmId: string;
}
```

**الاستخدام:**
```tsx
<EquipmentView farmId={farmId} />
```

### 2. FinanceCalculatorView.tsx

**الموقع:** `src/components/B2F/farmCommand/FinanceCalculatorView.tsx`

**الميزات:**
- ✅ تسجيل مدخول/مصروف
- ✅ تعديل عملية موجودة
- ✅ حذف عملية
- ✅ فلترة حسب النوع (الكل/مدخول/مصروف)
- ✅ إحصائيات مالية real-time
- ✅ حساب الرصيد تلقائياً

**Props:**
```typescript
interface FinanceCalculatorViewProps {
  farmId: string;
}
```

**الاستخدام:**
```tsx
<FinanceCalculatorView farmId={farmId} />
```

---

## 🎨 UI/UX Features

### المعدات

**بطاقات الإحصائيات:**
- إجمالي المعدات
- تعمل (أخضر)
- صيانة (أصفر)
- متوقفة (أحمر)

**كل معدة تعرض:**
- الاسم
- الحالة (مع Badge ملون)
- الملاحظات (إن وجدت)
- أزرار تعديل وحذف

**Modal الإضافة/التعديل:**
- اسم المعدة *
- الحالة * (قائمة منسدلة)
- ملاحظات (اختياري)

### الحاسبة التشغيلية

**بطاقات الإحصائيات:**
- إجمالي المدخولات (أخضر)
- إجمالي المصروفات (أحمر)
- الرصيد (أزرق إذا موجب، برتقالي إذا سالب)

**فلاتر:**
- الكل
- مدخول
- مصروف

**كل عملية تعرض:**
- المبلغ (بتنسيق ريال سعودي)
- النوع (Badge)
- التاريخ
- الملاحظات (إن وجدت)
- أزرار تعديل وحذف

**Modal الإضافة/التعديل:**
- النوع * (زرّان: مدخول/مصروف)
- المبلغ * (رقم بفاصلة عشرية)
- التاريخ * (date picker)
- ملاحظات (اختياري)

---

## 🧪 اختبارات القبول

### اختبار 1: إضافة معدة

**الخطوات:**
1. افتح مزرعة: `/admin/b2f/farms/[farmId]`
2. انتقل لتاب "المعدات"
3. اضغط "إضافة معدة"
4. أدخل:
   - الاسم: "جرار زراعي"
   - الحالة: "تعمل"
   - ملاحظة: "تم الشراء 2026"
5. اضغط "إضافة"

**النتيجة المتوقعة:**
- ✅ تظهر المعدة في القائمة
- ✅ يتحدث عداد "إجمالي المعدات"
- ✅ يزيد عداد "تعمل" بـ 1

### اختبار 2: تسجيل مصروف

**الخطوات:**
1. افتح مزرعة: `/admin/b2f/farms/[farmId]`
2. انتقل لتاب "الحاسبة"
3. اضغط "تسجيل عملية"
4. اختر "مصروف"
5. أدخل:
   - المبلغ: 5000
   - التاريخ: اليوم
   - ملاحظة: "شراء أسمدة"
6. اضغط "تسجيل"

**النتيجة المتوقعة:**
- ✅ تظهر العملية في القائمة
- ✅ يزيد "إجمالي المصروفات" بـ 5000 ريال
- ✅ ينقص "الرصيد" بـ 5000 ريال

### اختبار 3: تسجيل مدخول

**الخطوات:**
1. في نفس التاب "الحاسبة"
2. اضغط "تسجيل عملية"
3. اختر "مدخول"
4. أدخل:
   - المبلغ: 10000
   - التاريخ: اليوم
   - ملاحظة: "بيع محصول"
5. اضغط "تسجيل"

**النتيجة المتوقعة:**
- ✅ تظهر العملية في القائمة
- ✅ يزيد "إجمالي المدخولات" بـ 10000 ريال
- ✅ يصبح "الرصيد" = 10000 - 5000 = 5000 ريال
- ✅ يكون الرصيد باللون الأزرق (موجب)

### اختبار 4: الفلترة

**الخطوات:**
1. اضغط زر "مدخول"

**النتيجة المتوقعة:**
- ✅ تظهر عمليات المدخول فقط
- ✅ تختفي عمليات المصروف

**الخطوات:**
2. اضغط زر "مصروف"

**النتيجة المتوقعة:**
- ✅ تظهر عمليات المصروف فقط
- ✅ تختفي عمليات المدخول

**الخطوات:**
3. اضغط زر "الكل"

**النتيجة المتوقعة:**
- ✅ تظهر جميع العمليات

### اختبار 5: التعديل والحذف

**الخطوات:**
1. اضغط زر "تعديل" على معدة
2. غيّر الحالة إلى "صيانة"
3. احفظ

**النتيجة المتوقعة:**
- ✅ تتغير الحالة إلى "صيانة"
- ✅ يتحدث Badge إلى اللون الأصفر
- ✅ ينقص عداد "تعمل" بـ 1
- ✅ يزيد عداد "صيانة" بـ 1

**الخطوات:**
4. اضغط زر "حذف" على عملية مالية
5. أكّد الحذف

**النتيجة المتوقعة:**
- ✅ تُحذف العملية من القائمة
- ✅ تتحدث الإحصائيات تلقائياً

---

## 📊 تكامل مع ملخص المزرعة

في تاب "نظرة عامة" (`overview`)، تظهر إحصائيات من المرحلة 5:

```typescript
// في FarmDetailPage.tsx - Overview Tab
<div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-orange-500">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
      <Wrench className="w-6 h-6 text-orange-600" />
    </div>
    <div>
      <p className="text-3xl font-black text-gray-900">{stats.equipment_count}</p>
      <p className="text-sm text-gray-600">المعدات</p>
    </div>
  </div>
</div>

<div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
      <DollarSign className="w-6 h-6 text-blue-600" />
    </div>
    <div>
      <p className="text-3xl font-black text-blue-900">{formatCurrency(stats.monthly_net)}</p>
      <p className="text-sm text-gray-600">الصافي الشهري</p>
    </div>
  </div>
</div>
```

---

## 🔄 Real-time Updates

كلا النظامين يدعمان تحديثات real-time:

**المعدات:**
- عند إضافة/تعديل/حذف معدة → تتحدث القائمة والإحصائيات تلقائياً

**المالية:**
- عند إضافة/تعديل/حذف عملية → تتحدث القائمة والإحصائيات والرصيد تلقائياً

---

## 🎯 الميزات الرئيسية

### Lightweight Design

1. **جداول بسيطة** - لا توجد علاقات معقدة
2. **دوال مباشرة** - RPC functions بسيطة للإحصائيات فقط
3. **UI بديهي** - نماذج وبطاقات واضحة
4. **No Over-engineering** - فقط الميزات المطلوبة

### Security First

1. **RLS محكم** - فقط مدير المزرعة يمكنه التعديل
2. **Validation** - فحوصات على مستوى Database
3. **Type Safety** - TypeScript في كل مكان

### User Experience

1. **ألوان واضحة** - أخضر/أصفر/أحمر للحالات
2. **Badges ملونة** - تمييز بصري فوري
3. **تنسيق عملات** - Intl.NumberFormat
4. **Empty States** - رسائل واضحة عند عدم وجود بيانات

---

## 📁 الملفات المُنشأة

### Database (1 Migration)
1. ✅ `supabase/migrations/create_farm_equipment_and_finance_simple.sql`

### Frontend (2 Components)
1. ✅ `src/components/B2F/farmCommand/EquipmentView.tsx`
2. ✅ `src/components/B2F/farmCommand/FinanceCalculatorView.tsx`

### Integration (1 Update)
1. ✅ `src/components/platform/FarmDetailPage.tsx` - إضافة imports ودمج التابات

### Documentation (1 File)
1. ✅ `PHASE5_EQUIPMENT_FINANCE_GUIDE.md` - هذا الملف

---

## 🚀 Build Status

```bash
npm run build
✓ built in 13.61s

dist/index.html                           1.29 kB
dist/assets/index-Cf__b9gB.css          193.90 kB
dist/assets/supabase-BE3Klt9T.js        125.87 kB
dist/assets/react-vendor-OQHNr06Z.js    176.53 kB
dist/assets/icons-UjxmRWVk.js           707.03 kB
dist/assets/index-BwcXCL8L.js         1,172.74 kB
```

**الحالة:** ✅ Build ناجح بدون أخطاء

---

## ✅ قائمة التحقق النهائية

- [x] جدول `farm_equipment` موجود في Database
- [x] جدول `farm_financial_entries` موجود في Database
- [x] RPC Functions موجودة ومُختبَرة
- [x] RLS Policies محكمة لكلا الجدولين
- [x] Component `EquipmentView` موجود ويعمل
- [x] Component `FinanceCalculatorView` موجود ويعمل
- [x] التابات مدمجة في `FarmDetailPage`
- [x] Build ناجح بدون أخطاء
- [x] UI responsive وواضح
- [x] Real-time updates تعمل
- [x] Empty states مُصمّمة
- [x] Validation على مستوى Database
- [x] TypeScript types كاملة

---

## 🎉 النتيجة النهائية

**المرحلة 5 مكتملة 100% وجاهزة للاستخدام الفوري!**

يمكن الآن:
1. فتح أي مزرعة: `/admin/b2f/farms/[farmId]`
2. الانتقال لتاب "المعدات"
   - إضافة وتتبع معدات المزرعة
   - تغيير حالتها التشغيلية
3. الانتقال لتاب "الحاسبة"
   - تسجيل مدخولات ومصروفات
   - عرض الرصيد الحالي
   - فلترة العمليات

**كل شيء lightweight، بسيط، وفعّال!** 🚀

---

**التطوير:** Claude (Sonnet 4.5)
**التاريخ:** 2026-01-05
**المراحل المكتملة:** 1، 2، 3، 4، 5
