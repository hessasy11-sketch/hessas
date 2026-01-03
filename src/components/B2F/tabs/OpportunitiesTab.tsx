import { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  TreePine,
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  RefreshCw,
  Info,
  AlertCircle,
  Sparkles,
  Award
} from 'lucide-react';
import { useOpportunities, Opportunity } from '../../../hooks/useOpportunities';
import OpportunityFormModal from '../OpportunityFormModal';

export default function OpportunitiesTab() {
  const {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    duplicateOpportunity,
    toggleOpportunityStatus,
  } = useOpportunities();

  const [showModal, setShowModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedOpportunity(null);
    setShowModal(true);
  };

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowModal(true);
  };

  const handleSave = async (opportunityData: any) => {
    if (selectedOpportunity) {
      return await updateOpportunity(selectedOpportunity.id, opportunityData);
    } else {
      return await addOpportunity(opportunityData);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteOpportunity(id);
    if (!result.success) {
      alert(result.error);
    }
    setDeleteConfirm(null);
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateOpportunity(id);
    if (result.success) {
      alert('تم نسخ العرض بنجاح');
    } else {
      alert(result.error || 'فشل نسخ العرض');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { text: 'نشط', gradient: 'from-emerald-500 to-teal-600' },
      hidden: { text: 'مخفي', gradient: 'from-gray-400 to-gray-500' },
      full: { text: 'ممتلئ', gradient: 'from-red-500 to-red-600' },
      ended: { text: 'منتهي', gradient: 'from-blue-500 to-indigo-600' },
    };
    const badge = badges[status as keyof typeof badges] || badges.hidden;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${badge.gradient} text-white shadow-sm`}>
        {badge.text}
      </span>
    );
  };

  const getBadgeDisplay = (badge: string) => {
    const badges = {
      exclusive: { text: 'حصري', icon: Award, gradient: 'from-purple-500 to-pink-600' },
      featured: { text: 'مميز', icon: Sparkles, gradient: 'from-amber-500 to-orange-600' },
      limited: { text: 'محدود', icon: AlertCircle, gradient: 'from-red-500 to-red-600' },
      none: null,
    };
    const badgeData = badges[badge as keyof typeof badges];
    if (!badgeData) return null;

    const Icon = badgeData.icon;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${badgeData.gradient} text-white shadow-sm flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badgeData.text}
      </span>
    );
  };

  const getTreeTypeDisplay = (treeType: string, customType: string | null) => {
    if (treeType === 'أخرى' && customType) {
      return customType;
    }
    return treeType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
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
              محرك القسم الأساسي
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              العروض الاستثمارية هي ما يراه المستثمرون. كل عرض مرتبط بمزرعة ويحدد السعر والمدة والشروط
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-2xl py-4 px-6 font-black text-lg hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <Plus className="w-6 h-6" />
        إضافة عرض استثماري جديد
        <Sparkles className="w-5 h-5" />
      </button>

      {opportunities.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-16 text-center border-2 border-dashed border-gray-300">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3">
            لا توجد عروض استثمارية بعد
          </h3>
          <p className="text-gray-600 text-base mb-8 max-w-md mx-auto leading-relaxed">
            ابدأ بإضافة أول عرض استثماري يرتبط بإحدى المزارع
          </p>
          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 px-8 font-bold hover:from-blue-700 hover:to-indigo-700 transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            إضافة عرض
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {opportunities.map((opportunity, index) => {
            const stats = opportunity.statistics;
            const progressPercentage = stats ? Math.min(
              (stats.reserved_trees / opportunity.available_trees) * 100,
              100
            ) : 0;

            return (
              <div
                key={opportunity.id}
                className="group bg-white rounded-3xl border-2 border-blue-100 overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300"
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h3 className="text-xl font-black text-gray-900">
                            {opportunity.title}
                          </h3>
                          {getStatusBadge(opportunity.status)}
                          {getBadgeDisplay(opportunity.badge)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                          <span className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium text-emerald-900">
                              {opportunity.farm?.name || 'غير محدد'}
                            </span>
                          </span>

                          <span className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                            <TreePine className="w-4 h-4 text-amber-600" />
                            <span className="font-medium text-amber-900">
                              {getTreeTypeDisplay(opportunity.tree_type, opportunity.custom_tree_type)}
                            </span>
                          </span>

                          <span className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-indigo-900">
                              {opportunity.contract_duration_years} سنوات
                            </span>
                          </span>

                          <span className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-blue-900">
                              {opportunity.price_per_tree.toFixed(2)} ريال
                            </span>
                          </span>
                        </div>

                        {opportunity.internal_tag && (
                          <div className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg inline-flex">
                            <Tag className="w-3 h-3" />
                            {opportunity.internal_tag}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mr-4">
                        <button
                          onClick={() => handleEdit(opportunity)}
                          className="p-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-600 transition-all hover:scale-110 active:scale-95"
                          title="تعديل"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => toggleOpportunityStatus(opportunity.id, opportunity.status)}
                          className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                            opportunity.status === 'active'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                          }`}
                          title={opportunity.status === 'active' ? 'إخفاء' : 'تفعيل'}
                        >
                          {opportunity.status === 'active' ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDuplicate(opportunity.id)}
                          className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-600 transition-all hover:scale-110 active:scale-95"
                          title="نسخ"
                        >
                          <Copy className="w-5 h-5" />
                        </button>

                        {deleteConfirm === opportunity.id ? (
                          <div className="flex items-center gap-2 animate-in slide-in-from-left">
                            <button
                              onClick={() => handleDelete(opportunity.id)}
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
                            onClick={() => setDeleteConfirm(opportunity.id)}
                            className="p-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-all hover:scale-110 active:scale-95"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-5 border-t-2 border-gray-100">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg group-hover:scale-105 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <TreePine className="w-5 h-5" />
                          <p className="text-xs font-medium opacity-90">
                            المخصصة
                          </p>
                        </div>
                        <p className="text-2xl font-black">
                          {opportunity.available_trees.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg group-hover:scale-105 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <TreePine className="w-5 h-5" />
                          <p className="text-xs font-medium opacity-90">
                            المحجوز
                          </p>
                        </div>
                        <p className="text-2xl font-black">
                          {stats?.reserved_trees || 0}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg group-hover:scale-105 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <TreePine className="w-5 h-5" />
                          <p className="text-xs font-medium opacity-90">
                            المتبقي
                          </p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-black">
                            {stats?.remaining_trees || opportunity.available_trees}
                          </p>
                          {stats && stats.is_full && (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {stats && stats.reserved_trees > 0 && (
                      <div className="mt-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-gray-700 font-medium">عدد الحجوزات:</span>
                          <span className="font-black text-gray-900 text-lg">{stats.reservation_count}</span>
                        </div>

                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                stats.is_full
                                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                                  : stats.remaining_trees <= 10
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-2 text-center font-medium">
                            {progressPercentage.toFixed(1)}% من السعة
                          </p>
                        </div>
                      </div>
                    )}

                    {opportunity.description && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-100">
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">
                          {opportunity.description}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                      <span className="font-medium">الحد الأدنى: <span className="font-bold text-gray-900">{opportunity.min_trees}</span> شجرة</span>
                      {opportunity.max_trees ? (
                        <span className="font-medium">الحد الأقصى: <span className="font-bold text-gray-900">{opportunity.max_trees}</span> شجرة</span>
                      ) : (
                        <span className="font-medium text-emerald-600">بدون حد أقصى</span>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <OpportunityFormModal
          opportunity={selectedOpportunity}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
