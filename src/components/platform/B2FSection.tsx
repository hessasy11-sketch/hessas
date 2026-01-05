import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, MapPin, User, CheckCircle, Clock } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  region: string;
  manager: string;
  status: 'active' | 'setup';
}

const sampleFarms: Farm[] = [
  {
    id: '1',
    name: 'مزرعة الخير',
    region: 'الرياض',
    manager: 'أحمد محمد',
    status: 'active',
  },
  {
    id: '2',
    name: 'مزرعة النماء',
    region: 'جدة',
    manager: 'خالد أحمد',
    status: 'active',
  },
  {
    id: '3',
    name: 'مزرعة البركة',
    region: 'الدمام',
    manager: 'محمد علي',
    status: 'setup',
  },
];

export default function B2FSection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/hq')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
          العودة للوحة الإدارة
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 shadow-lg">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            إدارة استثمار أشجار المزارع
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            بوابة تنظيم الاستثمار الزراعي وربط الإدارة بالمزارع.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">المزارع</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleFarms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => navigate(`/hq/b2f/farms/${farm.id}`)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-right border border-gray-200 hover:border-green-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {farm.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{farm.region}</span>
                    </div>
                  </div>
                  {farm.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      نشطة
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      تحت الإعداد
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{farm.manager}</span>
                </div>

                <div className="flex items-center justify-end text-green-600 group-hover:translate-x-1 transition-transform duration-300">
                  <span className="text-sm font-medium ml-1">عرض المزرعة</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
          <p className="text-sm text-green-700">
            📌 قائمة المزارع والتفاصيل – جاهزة للتطوير لاحقًا
          </p>
        </div>
      </div>
    </div>
  );
}
