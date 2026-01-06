# المرحلة 3: بطاقة العقود والاستثمارات المرتبطة ✅

## 📊 حالة التنفيذ

```
✅ المرحلة 3: مُنفّذة بالكامل وتعمل بنجاح
```

---

## 🎯 الهدف

إضافة بطاقة داخل صفحة المزرعة تعرض:
- عدد العقود المرتبطة بالمزرعة
- آخر عقد تم توثيقه
- مجموع الاستثمارات/الأشجار
- زر "عرض تفاصيل العقد" (قراءة فقط)

---

## 📍 الموقع في الواجهة

```
المسار: /admin/b2f/farms/:farmId?tab=overview

الموقع في الصفحة:
FarmDetailPage
  ↓
  Tab: نظرة عامة (overview)
  ↓
  1. FarmDailySummaryCard
  2. FarmContractsCard ← هنا!
  3. Stats Grid
```

---

## 📦 المكونات المُنفّذة

### 1. دوال SQL (Backend)

#### Function: get_farm_contracts_quick_stats

```sql
الملف: create_farm_contracts_summary_functions.sql

الوظيفة: إحصائيات سريعة للعقود المرتبطة بمزرعة

المُدخلات:
✅ p_farm_id (uuid) - معرف المزرعة

المُخرجات (json):
{
  "stats": {
    "total_contracts": 2,
    "active_contracts": 2,
    "total_trees": 30,
    "total_investment": 112000,
    "unique_investors": 2
  },
  "last_contract": {
    "contract_id": "...",
    "contract_number": "SETUP-TEST-20260106-030212",
    "status": "active",
    "investor_phone": "0551122334",
    "trees_count": 20,
    "amount_total": 100000,
    "start_date": "2026-01-06",
    "end_date": "2027-01-06",
    "duration_years": 1,
    "days_since_created": 0
  }
}
```

#### Function: get_farm_contracts_summary

```sql
الوظيفة: إحصائيات شاملة وتفصيلية

المُخرجات:
✅ total_contracts - إجمالي العقود
✅ active_contracts - العقود النشطة
✅ draft_contracts - المسودات
✅ cancelled_contracts - العقود الملغاة
✅ expired_contracts - العقود المنتهية
✅ total_trees - مجموع الأشجار
✅ total_investment - مجموع الاستثمارات
✅ total_paid - المبلغ المدفوع
✅ total_remaining - المبلغ المتبقي
✅ unique_investors - عدد المستثمرين الفريدين
✅ last_contract_date - تاريخ آخر عقد
✅ last_contract_number - رقم آخر عقد
✅ has_contracts - هل يوجد عقود؟
```

#### Function: get_farm_contracts_list

```sql
الوظيفة: قائمة تفصيلية بالعقود مع pagination

المُدخلات:
✅ p_farm_id (uuid)
✅ p_limit (integer) - default: 10
✅ p_offset (integer) - default: 0

المُخرجات (table):
✅ contract_id
✅ contract_number
✅ contract_type
✅ status
✅ investor_phone
✅ investor_name
✅ trees_count
✅ amount_total, paid_amount, remaining_amount
✅ start_date, end_date, duration_years
✅ operation_status
✅ is_transferred
✅ created_at
✅ days_active
✅ is_expired
```

#### Function: get_farm_last_contract

```sql
الوظيفة: آخر عقد تم توثيقه للمزرعة

المُخرجات (json):
جميع تفاصيل آخر عقد بترتيب created_at DESC
```

---

### 2. مكون البطاقة (FarmContractsCard)

```typescript
الملف: src/components/platform/FarmContractsCard.tsx

Props:
✅ farmId: string - معرف المزرعة
✅ farmName: string - اسم المزرعة
✅ onViewContract?: (contractId: string) => void - callback

المميزات:
✅ تحميل تلقائي للبيانات عند التركيب
✅ عرض حالات: loading, error, empty, data
✅ تصميم جذاب بألوان متدرجة
✅ 4 بطاقات إحصائيات صغيرة:
   - إجمالي العقود
   - عدد الأشجار
   - الاستثمارات
   - المستثمرين
✅ بطاقة آخر عقد مع تفاصيل كاملة
✅ زر "عرض تفاصيل العقد" ديناميكي
```

#### التصميم البصري:

```
┌──────────────────────────────────────────────┐
│ 🔰 العقود والاستثمارات المرتبطة     [2 عقد نشط] │
│    مزرعة النخيل التجريبية                      │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │  2  │ │ 30  │ │ 112k│ │  2  │           │
│  │عقود │ │أشجار│ │ ريال│ │مستثمر│          │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│                                              │
│  📅 آخر عقد تم توثيقه         [نشط]         │
│  ┌──────────────────────────────────────┐   │
│  │ رقم العقد: SETUP-TEST-20260106...   │   │
│  │ الهاتف: 0551122334                  │   │
│  │ الأشجار: 20 | القيمة: 100,000 ريال  │   │
│  │ البداية: 6 يناير 2026               │   │
│  │ المدة: 1 سنة                        │   │
│  │ [عقد جديد - تم إنشاؤه اليوم]       │   │
│  │                                      │   │
│  │ [👁 عرض تفاصيل العقد]              │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

### 3. مكون Modal لتفاصيل العقد

```typescript
الملف: src/components/platform/ContractDetailsModal.tsx

Props:
✅ contractId: string - معرف العقد
✅ isOpen: boolean - حالة الظهور
✅ onClose: () => void - دالة الإغلاق

المميزات:
✅ تصميم Modal كامل الشاشة (responsive)
✅ header بألوان متدرجة
✅ تحميل تفاصيل العقد من b2f_contracts
✅ عرض شامل لجميع بيانات العقد:
   - رقم العقد والحالة
   - معلومات المستثمر
   - تفاصيل الاستثمار (أشجار، قيمة، مدة)
   - حالة الدفع (مع progress bar)
   - التواريخ (البداية، النهاية، الإنشاء)
   - حالة التشغيل
✅ قراءة فقط - لا يمكن التعديل
✅ زر إغلاق واضح
```

#### التصميم البصري للـ Modal:

```
┌─────────────────────────────────────────────────┐
│ 🔰 تفاصيل العقد              [×]               │
│    قراءة فقط                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  SETUP-TEST-20260106-030212     [✅ نشط]       │
│  ───────────────────────────────────────────    │
│                                                 │
│  👤 معلومات المستثمر                           │
│  ┌───────────────────────────────────────┐     │
│  │ الهاتف: 0551122334                    │     │
│  └───────────────────────────────────────┘     │
│                                                 │
│  🌳 20 شجرة  │  💰 100,000 ريال  │  ⏱ 1 سنة   │
│                                                 │
│  💳 حالة الدفع                                 │
│  المدفوع: 0 ريال | المتبقي: 100,000 ريال      │
│  [████████████░░░░░░░░] 0%                    │
│                                                 │
│  📅 التواريخ                                   │
│  البداية: 6 يناير 2026                         │
│  الانتهاء: 6 يناير 2027                        │
│  الأيام النشطة: 0 يوم                         │
│                                                 │
│  📍 حالة التشغيل: في الانتظار                 │
│                                                 │
│  [إغلاق]                                       │
└─────────────────────────────────────────────────┘
```

---

### 4. التكامل مع FarmDetailPage

```typescript
التغييرات:

1. استيراد المكونات:
   ✅ import FarmContractsCard
   ✅ import ContractDetailsModal

2. إضافة state:
   ✅ selectedContractId
   ✅ showContractModal

3. إضافة handler:
   ✅ handleViewContract(contractId)

4. إضافة البطاقة في overview tab:
   <div className="mb-8">
     <FarmContractsCard
       farmId={farmId}
       farmName={farm.name}
       onViewContract={handleViewContract}
     />
   </div>

5. إضافة Modal في نهاية الصفحة:
   {selectedContractId && (
     <ContractDetailsModal
       contractId={selectedContractId}
       isOpen={showContractModal}
       onClose={() => {
         setShowContractModal(false);
         setSelectedContractId(null);
       }}
     />
   )}
```

---

## 🧪 الاختبار والتحقق

### نتائج الاختبار:

```sql
-- اختبار دالة get_farm_contracts_quick_stats
SELECT * FROM (
  SELECT
    f.id,
    f.name,
    get_farm_contracts_quick_stats(f.id) as data
  FROM b2f_farms f
  WHERE EXISTS (SELECT 1 FROM b2f_contracts WHERE farm_id = f.id)
  LIMIT 2
);

النتائج:
✅ مزرعة النخيل التجريبية:
   - العقود: 2
   - الأشجار: 30
   - الاستثمارات: 112,000 ريال
   - المستثمرين: 2
   - آخر عقد: SETUP-TEST-20260106-030212

✅ مزرعة الزيتون المتطور:
   - العقود: 3
   - الأشجار: 16
   - الاستثمارات: 75,199 ريال
   - المستثمرين: 3
   - آخر عقد: TEST-20260106-025711-01
```

### اختبار القبول:

```
✅ فتح صفحة مزرعة: /admin/b2f/farms/:farmId
✅ Tab نظرة عامة مفتوح
✅ بطاقة العقود ظاهرة
✅ الإحصائيات صحيحة:
   - عدد العقود ✓
   - عدد الأشجار ✓
   - مجموع الاستثمارات ✓
   - عدد المستثمرين ✓
✅ آخر عقد معروض بتفاصيل كاملة
✅ زر "عرض تفاصيل العقد" يعمل
✅ Modal يفتح ويعرض جميع التفاصيل
✅ قراءة فقط - لا يمكن التعديل
```

---

## 📊 البيانات الفعلية

### من مزرعة النخيل التجريبية:

```json
{
  "stats": {
    "total_contracts": 2,
    "active_contracts": 2,
    "total_trees": 30,
    "total_investment": 112000,
    "unique_investors": 2
  },
  "last_contract": {
    "contract_id": "2f5afd54-3852-4d2c-8228-5323b041e3ba",
    "contract_number": "SETUP-TEST-20260106-030212",
    "contract_type": "tree_lease",
    "status": "active",
    "investor_phone": "0551122334",
    "investor_name": null,
    "trees_count": 20,
    "amount_total": 100000,
    "start_date": "2026-01-06",
    "end_date": "2027-01-06",
    "duration_years": 1,
    "created_at": "2026-01-06T03:02:12.40513+00:00",
    "operation_status": "pending",
    "days_since_created": 0
  }
}
```

---

## 🎨 المميزات البصرية

### 1. التدرجات اللونية

```css
✅ Header البطاقة: from-green-50 to-emerald-50
✅ إجمالي العقود: from-blue-50 to-blue-100
✅ عدد الأشجار: from-green-50 to-green-100
✅ الاستثمارات: from-emerald-50 to-emerald-100
✅ المستثمرين: from-purple-50 to-purple-100
✅ آخر عقد: from-gray-50 to-white
✅ Modal Header: from-green-600 to-emerald-600
```

### 2. الأيقونات

```
✅ البطاقة الرئيسية: FileCheck
✅ العقود النشطة: Activity
✅ إجمالي العقود: FileCheck
✅ الأشجار: TreePine
✅ الاستثمارات: DollarSign
✅ المستثمرين: Users
✅ التاريخ: Calendar
✅ عرض العقد: Eye + ChevronRight
✅ عقد جديد: TrendingUp
```

### 3. حالات العقود

```typescript
Status Badges:
✅ active: bg-green-100 text-green-700 (نشط)
✅ draft: bg-blue-100 text-blue-700 (مسودة)
✅ cancelled: bg-red-100 text-red-700 (ملغي)
✅ expired: bg-gray-100 text-gray-700 (منتهي)
```

### 4. Responsive Design

```
✅ Mobile: grid-cols-2 (الإحصائيات)
✅ Tablet: md:grid-cols-4
✅ Desktop: كامل العرض
✅ Modal: max-w-4xl مع scrolling
```

---

## 💡 حالات الاستخدام

### حالة 1: مزرعة لديها عقود

```
✅ تظهر البطاقة مع جميع الإحصائيات
✅ عرض آخر عقد تم توثيقه
✅ زر "عرض تفاصيل العقد" نشط
✅ يمكن فتح Modal لكل عقد
```

### حالة 2: مزرعة بدون عقود

```
✅ تظهر رسالة: "لا توجد عقود مرتبطة بهذه المزرعة"
✅ رمز FileCheck رمادي
✅ نص توضيحي: "سيتم عرض العقود هنا عند إنشائها"
```

### حالة 3: خطأ في التحميل

```
✅ عرض رسالة خطأ واضحة
✅ زر "إعادة المحاولة"
✅ يعيد تحميل البيانات عند النقر
```

### حالة 4: جاري التحميل

```
✅ Loader2 spinner متحرك
✅ لون أزرق (blue-600)
✅ في منتصف البطاقة
```

---

## 🔒 الأمان والصلاحيات

### RLS Policies:

```sql
✅ جميع دوال SQL لها SECURITY DEFINER
✅ GRANT EXECUTE TO authenticated
✅ GRANT EXECUTE TO anon (للوصول العام)
✅ جدول b2f_contracts محمي بـ RLS
```

### قراءة فقط:

```
✅ Modal لا يحتوي على حقول إدخال
✅ لا توجد أزرار تعديل
✅ فقط زر "إغلاق"
✅ البطاقة للعرض فقط
```

---

## 📝 استعلامات مفيدة

### جلب إحصائيات مزرعة:

```sql
SELECT get_farm_contracts_quick_stats('farm_id_here');
```

### جلب قائمة العقود:

```sql
SELECT * FROM get_farm_contracts_list('farm_id_here', 10, 0);
```

### جلب آخر عقد:

```sql
SELECT get_farm_last_contract('farm_id_here');
```

### المزارع مع عقودها:

```sql
SELECT
  f.name as farm_name,
  (SELECT COUNT(*) FROM b2f_contracts WHERE farm_id = f.id) as contracts_count,
  (SELECT SUM(trees_count) FROM b2f_contracts WHERE farm_id = f.id) as total_trees
FROM b2f_farms f
WHERE EXISTS (SELECT 1 FROM b2f_contracts WHERE farm_id = f.id)
ORDER BY contracts_count DESC;
```

---

## 🚀 التحسينات المستقبلية (اقتراحات)

### Phase 3.1: تصفية وبحث

```
- فلترة العقود حسب الحالة
- بحث برقم العقد أو رقم الهاتف
- ترتيب حسب التاريخ أو القيمة
```

### Phase 3.2: إحصائيات متقدمة

```
- رسم بياني لتوزيع العقود
- timeline للعقود
- مقارنة بين المزارع
```

### Phase 3.3: إشعارات

```
- تنبيه عند اقتراب انتهاء عقد
- إشعار عند إنشاء عقد جديد
- تذكير بالمدفوعات المتأخرة
```

### Phase 3.4: تصدير

```
- تصدير العقود إلى Excel
- طباعة تقرير العقود
- تنزيل PDF لعقد معين
```

---

## ✅ متطلبات المرحلة 3 - مُنجزة

### المطلوب الأساسي:

- [x] Backend: دوال لجلب بيانات العقود المرتبطة
- [x] بطاقة في صفحة المزرعة تعرض:
  - [x] عدد العقود المرتبطة ✅
  - [x] آخر عقد تم توثيقه ✅
  - [x] مجموع الاستثمارات/الأشجار ✅
  - [x] زر "عرض تفاصيل العقد" ✅
- [x] Modal لعرض تفاصيل العقد (قراءة فقط) ✅
- [x] Frontend: التكامل مع FarmDetailPage ✅

### اختبار القبول:

- [x] فتح مزرعة → ترى العقد المرتبط واضح ✅
- [x] جميع الإحصائيات صحيحة ✅
- [x] آخر عقد معروض بتفاصيله ✅
- [x] زر عرض العقد يعمل ✅
- [x] Modal يفتح ويعرض كل شيء ✅
- [x] قراءة فقط - لا تعديل ✅

---

## 🔄 التكامل مع المراحل السابقة

```
المرحلة 1: نظام ولادة المزرعة
  ↓
  ينشئ حدث FARM_BORN عند تفعيل عقد
  ↓
المرحلة 2: مهام التأسيس
  ↓
  يولد 6 مهام تلقائياً للمزرعة
  ↓
المرحلة 3: بطاقة العقود ← أنت هنا!
  ↓
  تعرض جميع العقود المرتبطة بالمزرعة
  ↓
  المستقبل: إدارة العقود، التجديد، التحويل...
```

---

## 📦 الملفات المُنشأة

```
✅ create_farm_contracts_summary_functions.sql
   - 4 دوال SQL للبيانات

✅ FarmContractsCard.tsx
   - مكون البطاقة الرئيسي

✅ ContractDetailsModal.tsx
   - مكون Modal التفاصيل

✅ FarmDetailPage.tsx (محدّث)
   - التكامل مع البطاقة والModal

✅ PHASE3_FARM_CONTRACTS_CARD_COMPLETE.md
   - هذا الملف - التوثيق الكامل
```

---

## ✅ ملخص التنفيذ

```
الحالة: ✅ المرحلة 3 مُنجزة بالكامل

المكونات:
✅ 4 دوال SQL جديدة
✅ مكون بطاقة العقود (FarmContractsCard)
✅ مكون Modal التفاصيل (ContractDetailsModal)
✅ تكامل كامل مع FarmDetailPage
✅ تصميم responsive وجذاب
✅ معالجة جميع الحالات (empty, loading, error, success)

النتائج:
✅ البطاقة تظهر في صفحة المزرعة
✅ جميع البيانات صحيحة ودقيقة
✅ Modal يعمل بشكل مثالي
✅ قراءة فقط كما طُلب
✅ Build ناجح بدون أخطاء

الوقت المستغرق: ~35 دقيقة
الكود: نظيف ومُوثّق
الجودة: إنتاجية
```

---

**المرحلة 3: بطاقة العقود والاستثمارات - مُنجزة بنجاح! 🎉**

**التكامل مع المراحل 1 و 2 يعمل بشكل ممتاز! 🚀**

**جاهز للمراحل القادمة متى ما طُلب ذلك! 📋**
