import { Info, TreePine, Palmtree, Leaf, MoreHorizontal } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'info' | 'all' | 'tree-type';
  value?: string;
}

interface OpportunityCategorySliderProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onInfoClick: () => void;
  availableTreeTypes: string[];
}

export default function OpportunityCategorySlider({
  selectedCategory,
  onCategoryChange,
  onInfoClick,
  availableTreeTypes
}: OpportunityCategorySliderProps) {
  const categories: Category[] = [
    {
      id: 'info',
      label: 'عن الاستثمار',
      icon: <Info className="w-4 h-4" />,
      type: 'info'
    },
    {
      id: 'all',
      label: 'الكل',
      icon: <TreePine className="w-4 h-4" />,
      type: 'all'
    },
    {
      id: 'نخيل',
      label: 'نخيل',
      icon: <Palmtree className="w-4 h-4" />,
      type: 'tree-type',
      value: 'نخيل'
    },
    {
      id: 'زيتون',
      label: 'زيتون',
      icon: <Leaf className="w-4 h-4" />,
      type: 'tree-type',
      value: 'زيتون'
    }
  ];

  const otherTreeTypes = availableTreeTypes.filter(
    type => type !== 'نخيل' && type !== 'زيتون' && type !== 'أخرى'
  );

  otherTreeTypes.forEach(type => {
    categories.push({
      id: type,
      label: type,
      icon: <TreePine className="w-4 h-4" />,
      type: 'tree-type',
      value: type
    });
  });

  if (availableTreeTypes.includes('أخرى')) {
    categories.push({
      id: 'أخرى',
      label: 'أخرى',
      icon: <MoreHorizontal className="w-4 h-4" />,
      type: 'tree-type',
      value: 'أخرى'
    });
  }

  const handleClick = (category: Category) => {
    if (category.id === 'info') {
      onInfoClick();
    } else {
      onCategoryChange(category.id);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 p-4 min-w-max">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const isInfo = category.id === 'info';

            return (
              <button
                key={category.id}
                onClick={() => handleClick(category)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm
                  transition-all duration-200 whitespace-nowrap
                  ${
                    isInfo
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md'
                      : isSelected
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {category.icon}
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
