import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Package } from 'lucide-react';

export default function B2BSection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/hq')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
          العودة للوحة الإدارة
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 shadow-lg">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            إدارة مزاد الشركات
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            لوحة إشرافية لمتابعة مزادات الشركات بدون الدخول في تفاصيل تشغيلية.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <Package className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            هيكلة فقط
          </h3>
          <p className="text-gray-600 mb-2">
            هذا القسم جاهز للتطوير
          </p>
          <p className="text-sm text-gray-400">
            📌 التطوير لاحقًا
          </p>
        </div>
      </div>
    </div>
  );
}
