import { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  TreePine,
  RefreshCw,
  Info,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useB2FFarms, B2FFarm } from '../../../hooks/useB2FFarms';
import B2FFarmFormModal from '../B2FFarmFormModal';

export default function FarmsTab() {
  const { farms, loading, addFarm, updateFarm, deleteFarm, toggleFarmStatus } = useB2FFarms();
  const [showModal, setShowModal] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<B2FFarm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedFarm(null);
    setShowModal(true);
  };

  const handleEdit = (farm: B2FFarm) => {
    setSelectedFarm(farm);
    setShowModal(true);
  };

  const handleSave = async (farmData: any) => {
    if (selectedFarm) {
      return await updateFarm(selectedFarm.id, farmData);
    } else {
      return await addFarm(farmData);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteFarm(id);

    if (!result.success) {
      alert(result.error);
    }

    setDeleteConfirm(null);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm">
          مفعلة
        </span>
      );
    }
    return (
      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
        موقوفة
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-100 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-blue-900 mb-2">
              إدارة مركزية للمزارع
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              هذه المزارع تُستخدم كمراجع داخلية للعروض الاستثمارية. تتضمن معلومات عن عدد الأشجار والمساحة والموقع
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-2xl py-4 px-6 font-black text-lg hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <Plus className="w-6 h-6" />
        إضافة مزرعة جديدة
        <Sparkles className="w-5 h-5" />
      </button>

      {farms.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-16 text-center border-2 border-dashed border-gray-300">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3">
            لا توجد مزارع بعد
          </h3>
          <p className="text-gray-600 text-base mb-8 max-w-md mx-auto leading-relaxed">
            ابدأ بإضافة أول مزرعة لتتمكن من إنشاء العروض الاستثمارية
          </p>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-3 px-8 font-bold hover:from-emerald-700 hover:to-teal-700 transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            إضافة مزرعة
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {farms.map((farm, index) => (
            <div
              key={farm.id}
              className="group bg-white rounded-3xl border-2 border-emerald-100 overflow-hidden hover:shadow-2xl hover:border-emerald-300 transition-all duration-300"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 mb-1">
                            {farm.name}
                          </h3>
                          {getStatusBadge(farm.is_active)}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3 flex-wrap">
                        <span className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-900">
                            {farm.location}
                            {farm.city && ` - ${farm.city}`}
                          </span>
                        </span>

                        <span className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                          <TreePine className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            {farm.total_trees_available.toLocaleString()} شجرة
                          </span>
                        </span>
                      </div>

                      {farm.description && (
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">
                          {farm.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mr-4">
                      <button
                        onClick={() => handleEdit(farm)}
                        className="p-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-600 transition-all hover:scale-110 active:scale-95"
                        title="تعديل"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => toggleFarmStatus(farm.id, farm.is_active)}
                        className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                          farm.is_active
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                        }`}
                        title={farm.is_active ? 'إيقاف' : 'تفعيل'}
                      >
                        {farm.is_active ? (
                          <PowerOff className="w-5 h-5" />
                        ) : (
                          <Power className="w-5 h-5" />
                        )}
                      </button>

                      {deleteConfirm === farm.id ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left">
                          <button
                            onClick={() => handleDelete(farm.id)}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
                          >
                            تأكيد
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition-all"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(farm.id)}
                          className="p-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-all hover:scale-110 active:scale-95"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-5 border-t-2 border-gray-100">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg group-hover:scale-105 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <TreePine className="w-5 h-5" />
                        <p className="text-sm font-medium opacity-90">
                          إجمالي الأشجار
                        </p>
                      </div>
                      <p className="text-3xl font-black">
                        {farm.total_trees_available.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg group-hover:scale-105 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5" />
                        <p className="text-sm font-medium opacity-90">
                          تاريخ الإضافة
                        </p>
                      </div>
                      <p className="text-base font-bold">
                        {new Date(farm.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <B2FFarmFormModal
          farm={selectedFarm}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
