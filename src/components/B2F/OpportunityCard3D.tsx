import { useState } from 'react';
import { TreePine, MapPin, Calendar, Award, Image as ImageIcon } from 'lucide-react';
import { OpportunityWithStats } from '../../hooks/useOpportunities';
import ImagePreviewModal from './ImagePreviewModal';

interface OpportunityCard3DProps {
  opportunity: OpportunityWithStats;
  onDetailsClick: (opportunity: OpportunityWithStats) => void;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop';

export default function OpportunityCard3D({ opportunity, onDetailsClick }: OpportunityCard3DProps) {
  const [showImagePreview, setShowImagePreview] = useState(false);

  const images = Array.isArray(opportunity.images) && opportunity.images.length > 0
    ? opportunity.images
    : [PLACEHOLDER_IMAGE];

  const mainImage = images[0];

  const treeType = opportunity.tree_type === 'أخرى'
    ? opportunity.custom_tree_type || 'أشجار'
    : opportunity.tree_type;

  const location = opportunity.farm?.location || 'السعودية';

  const reserved = opportunity.statistics?.reserved_trees || 0;
  const remaining = opportunity.statistics?.remaining_trees || opportunity.available_trees;
  const total = opportunity.available_trees;
  const progress = total > 0 ? (reserved / total) * 100 : 0;

  const isLowStock = remaining < 20 && remaining > 0;

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'exclusive':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'featured':
        return 'bg-gradient-to-r from-blue-500 to-blue-700 text-white';
      case 'limited':
        return 'bg-gradient-to-r from-red-500 to-red-700 text-white';
      default:
        return '';
    }
  };

  const getBadgeText = (badge: string) => {
    switch (badge) {
      case 'exclusive':
        return 'حصري';
      case 'featured':
        return 'مميز';
      case 'limited':
        return 'محدود';
      default:
        return '';
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300"
        style={{
          width: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="relative">
          <button
            onClick={() => setShowImagePreview(true)}
            className="w-full aspect-[16/10] overflow-hidden bg-gray-100 group"
          >
            <img
              src={mainImage}
              alt={opportunity.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                {images.length}
              </div>
            )}
          </button>

          {opportunity.badge && opportunity.badge !== 'none' && (
            <div
              className={`absolute top-4 left-4 px-4 py-2 rounded-xl font-bold text-sm shadow-lg backdrop-blur-sm ${getBadgeStyle(
                opportunity.badge
              )}`}
            >
              {getBadgeText(opportunity.badge)}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 min-h-[3.5rem]">
            {opportunity.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TreePine className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="font-semibold">{treeType}</span>
            <span className="text-gray-400">•</span>
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{location}</span>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">السعر للعقد كامل</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-700">
                  {opportunity.contract_duration_years} سنوات
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {opportunity.price_per_tree.toLocaleString()} ر.س
              <span className="text-sm font-normal text-gray-600"> / شجرة</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">محجوز: {reserved.toLocaleString()}</span>
              <span
                className={`font-bold ${
                  isLowStock ? 'text-red-600' : 'text-green-600'
                }`}
              >
                متبقي: {remaining.toLocaleString()} شجرة
              </span>
            </div>

            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {isLowStock && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                <p className="text-sm font-bold text-red-700">
                  متبقي {remaining} شجرة فقط
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onDetailsClick(opportunity)}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            اكتشف التفاصيل
          </button>
        </div>
      </div>

      {showImagePreview && (
        <ImagePreviewModal
          images={images}
          initialIndex={0}
          onClose={() => setShowImagePreview(false)}
        />
      )}
    </>
  );
}
