import { useEffect, useState } from 'react';
import { Shield, Users, CheckCircle, Crown, Info } from 'lucide-react';
import { useGatewayAccess, GatewayMappingRow } from '../../hooks/useGatewayAccess';

export default function GatewayMappingTable() {
  const [mapping, setMapping] = useState<GatewayMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { getGatewayMapping } = useGatewayAccess();

  useEffect(() => {
    loadMapping();
  }, []);

  const loadMapping = async () => {
    setLoading(true);
    const data = await getGatewayMapping();
    setMapping(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">جاري تحميل جدول القَسْمَة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">جدول قَسْمَة البطاقات</h2>
            <p className="text-purple-100">Card to Role Mapping Table</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm leading-relaxed">
                هذا الجدول يوضح من يستطيع رؤية كل بطاقة في بوابة التاج حسب دوره.
                <strong className="block mt-1">المدير العام له Bypass كامل على جميع البطاقات.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-900">
                  البطاقة
                </th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-900">
                  المسار
                </th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-900">
                  من يراها
                </th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-900">
                  عدد الأدوار
                </th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-900">
                  ملاحظة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mapping.map((row, index) => (
                <tr
                  key={row.card_key}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{row.title_ar}</div>
                        <div className="text-xs text-gray-500 font-mono">{row.card_key}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                      {row.route_path}
                    </code>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {row.allowed_roles?.includes('ALL') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          الجميع
                        </span>
                      ) : row.allowed_roles?.includes('general_manager') && row.roles_count === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                          <Crown className="w-3 h-3" />
                          GM فقط
                        </span>
                      ) : (
                        row.allowed_roles?.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium"
                          >
                            <Users className="w-3 h-3" />
                            {role}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-sm">{row.roles_count}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      row.notes?.includes('GM Only') || row.notes?.includes('Bypass')
                        ? 'bg-purple-100 text-purple-700'
                        : row.notes?.includes('متاح للجميع')
                        ? 'bg-green-100 text-green-700'
                        : row.notes?.includes('ديناميكي')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {row.notes}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900">GM Bypass</h3>
          </div>
          <p className="text-sm text-purple-700">
            المدير العام يرى جميع البطاقات تلقائياً بدون الحاجة لمنح صلاحيات
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-900">عملي اليوم</h3>
          </div>
          <p className="text-sm text-green-700">
            البطاقة الوحيدة المتاحة لجميع الموظفين بدون استثناء
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">ديناميكي</h3>
          </div>
          <p className="text-sm text-amber-700">
            بطاقة المزرعة تظهر فقط للموظفين المعينين على مزارع محددة
          </p>
        </div>
      </div>
    </div>
  );
}
