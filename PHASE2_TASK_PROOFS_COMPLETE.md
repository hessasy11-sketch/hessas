# المرحلة 2: نظام إثباتات المهام - مكتمل ✅

## 📍 المسار المنفذ
```
/admin/b2f/farms/:farmId
└── Tab: مهام التشغيل
    ├── رفع إثبات (للعامل)
    └── مراجعة واعتماد (للمدير)
```

---

## ✅ المنجز الكامل

### 1️⃣ قاعدة البيانات

#### إضافات لجدول farm_tasks
```sql
ALTER TABLE farm_tasks ADD COLUMN:
- requires_proof BOOLEAN (هل المهمة تتطلب إثبات)
- proof_notes TEXT (ملاحظات العامل مع الإثبات)
```

#### Storage Bucket
```sql
✅ task-proofs (للصور والملفات)
✅ RLS Policies:
   - View: Public
   - Upload/Update/Delete: Authenticated & Anon
```

#### Functions مع ربط Timeline

##### 1. submit_task_with_proof()
```sql
المدخلات:
- p_task_id
- p_submitted_by
- p_submitted_by_name
- p_proof_notes

الإجراءات:
1. تحديث المهمة → status = 'submitted'
2. حفظ الملاحظات
3. تسجيل في Timeline → event_type = 'proof_uploaded'

المخرجات:
{success: true, task_id, timeline_id}
```

##### 2. approve_task_with_proof()
```sql
المدخلات:
- p_task_id
- p_approved_by
- p_approved_by_name
- p_approval_notes

الإجراءات:
1. تحديث المهمة → status = 'approved'
2. حفظ ملاحظات الاعتماد
3. تسجيل في Timeline → event_type = 'task_approved'

المخرجات:
{success: true, task_id, timeline_id}
```

##### 3. reject_task_with_proof()
```sql
المدخلات:
- p_task_id
- p_rejected_by
- p_rejected_by_name
- p_rejection_reason

الإجراءات:
1. تحديث المهمة → status = 'rejected'
2. حفظ سبب الرفض
3. تسجيل في Timeline → event_type = 'task_rejected'

المخرجات:
{success: true, task_id, timeline_id}
```

---

### 2️⃣ Hook: useTaskProofs

**الموقع:** `src/hooks/useTaskProofs.ts`

```typescript
interface API {
  // Data
  task: FarmTask | null
  proofs: TaskProof[]
  loading: boolean
  uploading: boolean
  error: string | null

  // Actions
  uploadProof(file: File, notes: string)
  approveTask(approverName: string, notes: string)
  rejectTask(rejectorName: string, reason: string)
  reload()
}
```

**الميزات:**
- ✅ تحميل المهمة والإثباتات
- ✅ رفع ملف مع Upload to Storage
- ✅ استدعاء Functions مع ربط Timeline
- ✅ معالجة الأخطاء
- ✅ Auto-reload بعد العمليات

---

### 3️⃣ Components

#### ProofUploadModal
**الموقع:** `src/components/platform/ProofUploadModal.tsx`

```
┌──────────────────────────────────┐
│  رفع إثبات إنجاز المهمة          │
├──────────────────────────────────┤
│  [📤 اضغط لرفع صورة]            │
│                                  │
│  ملاحظات: [textarea]            │
│                                  │
│  💡 نصائح لإثبات جيد            │
│                                  │
│  [إلغاء]  [رفع الإثبات]         │
└──────────────────────────────────┘
```

**الميزات:**
- ✅ Upload area جميل
- ✅ معاينة الصور
- ✅ ملاحظات اختيارية
- ✅ نصائح مفيدة
- ✅ Loading states

#### ProofReviewModal
**الموقع:** `src/components/platform/ProofReviewModal.tsx`

```
┌──────────────────────────────────┐
│  مراجعة إثبات المهمة             │
├──────────────────────────────────┤
│  👤 المكلف: أحمد محمد            │
│  📅 التاريخ: 6 يناير 2026       │
│                                  │
│  💬 ملاحظات العامل               │
│  "تم الإنجاز بنجاح..."          │
│                                  │
│  📷 الإثباتات (3)               │
│  [img] [img] [img]              │
│                                  │
│  [✅ اعتماد]  [❌ رفض]          │
└──────────────────────────────────┘
```

**الميزات:**
- ✅ عرض معلومات المهمة
- ✅ ملاحظات العامل
- ✅ معرض الصور/الملفات
- ✅ Lightbox للمعاينة الكاملة
- ✅ نماذج الاعتماد/الرفض
- ✅ Loading states

#### TaskProofManagement (Wrapper)
**الموقع:** `src/components/platform/TaskProofManagement.tsx`

**المنطق الذكي:**
```typescript
if (!requiresProof) return null;

if (status === 'pending' || 'in_progress') {
  // زر "رفع إثبات"
}

if (status === 'submitted') {
  // زر "مراجعة الإثبات (X)"
}

if (status === 'approved') {
  // ✅ تم الاعتماد
}

if (status === 'rejected') {
  // ⚠️ مرفوض
}
```

---

### 4️⃣ التكامل مع FarmTasksManagement

**التعديلات:**
```typescript
// 1. Import
import TaskProofManagement from './TaskProofManagement';

// 2. Interface Update
interface FarmTask {
  ...
  requires_proof?: boolean;
  proof_notes?: string | null;
}

// 3. في عرض المهمة
<TaskProofManagement
  taskId={task.task_id}
  taskTitle={task.title}
  taskStatus={task.status}
  requiresProof={task.requires_proof || false}
  onActionComplete={loadData}
/>
```

---

## 🎯 سير العمل الكامل

### سيناريو 1: عامل يرفع إثبات

```
1. العامل يفتح مهمة (requires_proof = true)
2. يرى زر "رفع إثبات" 📤
3. يضغط عليه → ProofUploadModal
4. يرفع صورة + ملاحظات
5. الصورة → Storage (task-proofs)
6. السجل → task_proofs
7. استدعاء submit_task_with_proof()
8. تغيير الحالة → submitted
9. تسجيل في Timeline ✅
```

### سيناريو 2: مدير يراجع ويعتمد

```
1. المدير يفتح مهام التشغيل
2. يرى مهمة بحالة "submitted"
3. يرى زر "مراجعة الإثبات (3)" 👁️
4. يضغط عليه → ProofReviewModal
5. يشاهد:
   - معلومات المهمة
   - ملاحظات العامل
   - الصور/الملفات (3)
6. يضغط "اعتماد"
7. يضيف ملاحظات (اختياري)
8. استدعاء approve_task_with_proof()
9. تغيير الحالة → approved
10. تسجيل في Timeline ✅
```

### سيناريو 3: مدير يرفض

```
1-5. نفس الخطوات السابقة
6. يضغط "رفض" ❌
7. يكتب سبب الرفض (إجباري)
8. استدعاء reject_task_with_proof()
9. تغيير الحالة → rejected
10. تسجيل في Timeline ✅
```

---

## 📊 الربط مع Timeline

### الأحداث المسجلة تلقائياً

#### عند رفع الإثبات
```json
{
  "event_type": "proof_uploaded",
  "event_data": {
    "task_title": "ري القطاع الشمالي",
    "task_type": "irrigation",
    "proof_notes": "تم الري بنجاح"
  },
  "actor_name": "أحمد محمد - عامل"
}
```

#### عند الاعتماد
```json
{
  "event_type": "task_approved",
  "event_data": {
    "task_title": "ري القطاع الشمالي",
    "task_type": "irrigation",
    "notes": "عمل ممتاز"
  },
  "actor_name": "مدير المزرعة"
}
```

#### عند الرفض
```json
{
  "event_type": "task_rejected",
  "event_data": {
    "task_title": "ري القطاع الشمالي",
    "task_type": "irrigation",
    "reason": "الصور غير واضحة"
  },
  "actor_name": "مدير المزرعة"
}
```

---

## 🧪 بيانات الاختبار

تم إضافة 3 مهام تجريبية:

### 1. ري القطاع الشمالي
```
✅ requires_proof: true
✅ status: pending
✅ priority: high
✅ assigned_to: أحمد محمد
```

### 2. تسميد الأشجار
```
✅ requires_proof: true
✅ status: in_progress
✅ priority: medium
✅ assigned_to: محمد علي
```

### 3. فحص حالة الأشجار
```
✅ requires_proof: true
✅ status: submitted
✅ priority: high
✅ assigned_to: خالد أحمد
✅ proof_notes: "تم الفحص بالكامل"
```

---

## 📝 اختبار القبول

### Test 1: رفع الإثبات (عامل)

```
1. افتح /admin/b2f/farms/:farmId
2. اذهب لـ Tab "مهام التشغيل"
3. ابحث عن مهمة "ري القطاع الشمالي"
4. يجب أن ترى زر "رفع إثبات" 📤
5. اضغط عليه
6. ارفع صورة
7. أضف ملاحظات
8. اضغط "رفع الإثبات"
9. تحقق:
   ✅ الصورة رفعت
   ✅ الحالة تغيرت → submitted
   ✅ ظهر حدث في Timeline
```

### Test 2: مراجعة الإثبات (مدير)

```
1. افتح نفس الصفحة
2. ابحث عن مهمة "فحص حالة الأشجار"
3. يجب أن ترى زر "مراجعة الإثبات"
4. اضغط عليه
5. تحقق من:
   ✅ معلومات المهمة واضحة
   ✅ ملاحظات العامل تظهر
   ✅ الإثباتات (إن وجدت) تظهر
6. اضغط "اعتماد المهمة"
7. أضف ملاحظات (اختياري)
8. اضغط "تأكيد الاعتماد"
9. تحقق:
   ✅ الحالة تغيرت → approved
   ✅ ظهر حدث "اعتماد مهمة" في Timeline
```

### Test 3: رفض المهمة (مدير)

```
1. نفس الخطوات لكن:
2. اضغط "رفض المهمة" ❌
3. اكتب سبب الرفض
4. اضغط "تأكيد الرفض"
5. تحقق:
   ✅ الحالة تغيرت → rejected
   ✅ ظهر حدث "رفض مهمة" في Timeline مع السبب
```

---

## 🎨 التصميم البصري

### ProofUploadModal
```
- خلفية بيضاء نظيفة
- Upload area بـ dashed border
- Preview للصور
- نصائح في box أزرق
- أزرار واضحة وكبيرة
```

### ProofReviewModal
```
- Header بـ gradient أخضر
- بطاقات معلومات المهمة
- معرض صور Grid 3 أعمدة
- Lightbox عند النقر على الصورة
- نماذج اعتماد/رفض ملونة
```

---

## 📦 الملفات المنشأة/المعدلة

```
Database:
✅ add_task_proofs_system_fixed.sql
✅ add_test_tasks_with_proofs.sql

Frontend:
✅ src/hooks/useTaskProofs.ts (جديد)
✅ src/components/platform/ProofUploadModal.tsx (جديد)
✅ src/components/platform/ProofReviewModal.tsx (جديد)
✅ src/components/platform/TaskProofManagement.tsx (جديد)
✅ src/components/platform/FarmTasksManagement.tsx (معدل)

Documentation:
✅ PHASE2_TASK_PROOFS_COMPLETE.md (هذا الملف)
```

---

## ✅ Checklist النهائي

- [x] حقل requires_proof في farm_tasks
- [x] Storage bucket للإثباتات
- [x] Functions مع ربط Timeline
- [x] Hook useTaskProofs
- [x] ProofUploadModal
- [x] ProofReviewModal
- [x] TaskProofManagement wrapper
- [x] تكامل مع FarmTasksManagement
- [x] بيانات تجريبية
- [x] Build ناجح
- [x] توثيق كامل

---

## 🔮 التطويرات المستقبلية

### Phase 2.5: تحسينات
```
- إضافة أنواع ملفات أخرى (PDF, Video)
- Thumbnails للملفات
- تعليقات على الإثباتات
- تقييم نجوم للإنجاز
```

### Phase 3: إشعارات
```
- إشعار للمدير عند رفع إثبات
- إشعار للعامل عند الاعتماد/الرفض
- Push notifications
- Email notifications
```

---

**المرحلة 2 مكتملة 100%! ✅**

**التكامل مع Timeline يعمل بنجاح! 🎉**

الآن يمكن:
1. رفع إثباتات للمهام ✅
2. مراجعة واعتماد/رفض ✅
3. تتبع جميع الأحداث في Timeline ✅
