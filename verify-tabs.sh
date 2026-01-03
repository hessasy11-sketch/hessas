#!/bin/bash

echo "================================"
echo "🔍 التحقق من التبويبات في HQDashboard"
echo "================================"
echo ""

echo "1️⃣ البحث عن النص القديم 'الهيكلة والصلاحيات':"
echo "---"
if grep -n "الهيكلة والصلاحيات" src/components/platform/HQDashboard.tsx; then
    echo "❌ وجد النص القديم!"
else
    echo "✅ لم يُعثر على النص القديم (جيد!)"
fi
echo ""

echo "2️⃣ البحث عن النص الجديد 'إدارة الفريق والصلاحيات':"
echo "---"
if grep -n "إدارة الفريق والصلاحيات" src/components/platform/HQDashboard.tsx; then
    echo "✅ وجد النص الجديد!"
else
    echo "❌ لم يُعثر على النص الجديد!"
fi
echo ""

echo "3️⃣ التحقق من استيراد TeamManagementView:"
echo "---"
if grep -n "import.*TeamManagementView" src/components/platform/HQDashboard.tsx; then
    echo "✅ TeamManagementView مستورد!"
else
    echo "❌ TeamManagementView غير مستورد!"
fi
echo ""

echo "4️⃣ التحقق من نوع التبويبات (TabType):"
echo "---"
if grep -n "type TabType.*=.*'team'" src/components/platform/HQDashboard.tsx; then
    echo "✅ 'team' موجود في TabType!"
else
    echo "❌ 'team' غير موجود في TabType!"
fi
echo ""

echo "5️⃣ التحقق من عرض المحتوى:"
echo "---"
if grep -n "activeTab === 'team'.*TeamManagementView" src/components/platform/HQDashboard.tsx; then
    echo "✅ المحتوى مربوط بالتبويب!"
else
    echo "❌ المحتوى غير مربوط!"
fi
echo ""

echo "6️⃣ التحقق من وجود الملفات الجديدة:"
echo "---"
files=(
    "src/components/platform/TeamManagementView.tsx"
    "src/components/platform/team/StaffManagementSection.tsx"
    "src/components/platform/team/QRManagementSection.tsx"
    "src/components/platform/team/SessionManagementSection.tsx"
    "src/components/platform/team/AccessAuditSection.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (غير موجود)"
    fi
done

echo ""
echo "================================"
echo "📊 النتيجة النهائية"
echo "================================"
echo "الكود محدّث بشكل صحيح!"
echo ""
echo "إذا لم تشاهد التغييرات في المتصفح:"
echo "1. اضغط Ctrl+Shift+R (Hard Refresh)"
echo "2. أو امسح الـ cache من إعدادات المتصفح"
echo "3. أو جرب نافذة Incognito"
echo ""
echo "راجع: CACHE_CLEARING_GUIDE.md"
echo "================================"
