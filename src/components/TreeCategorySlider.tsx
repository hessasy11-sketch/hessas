import { useRef } from 'react';

interface TreeCategory {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

interface TreeCategorySliderProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  availableCategories: string[];
  onShowInfo?: () => void;
}

const TREE_CATEGORIES: TreeCategory[] = [
  {
    id: 'all',
    name: 'الكل',
    icon: '🌳',
    keywords: []
  },
  {
    id: 'palm',
    name: 'نخيل',
    icon: '🌴',
    keywords: ['نخ', 'palm', 'نخيل', 'تمر']
  },
  {
    id: 'olive',
    name: 'زيتون',
    icon: '🫒',
    keywords: ['زيتون', 'olive', 'زيت']
  },
  {
    id: 'mango',
    name: 'مانجا',
    icon: '🥭',
    keywords: ['مانج', 'mango', 'منجا']
  },
  {
    id: 'banana',
    name: 'موز',
    icon: '🍌',
    keywords: ['موز', 'banana']
  },
  {
    id: 'apple',
    name: 'تفاح',
    icon: '🍎',
    keywords: ['تفاح', 'apple']
  },
  {
    id: 'orange',
    name: 'برتقال',
    icon: '🍊',
    keywords: ['برتقال', 'orange', 'يوسفي']
  },
  {
    id: 'pomegranate',
    name: 'رمان',
    icon: '🍓',
    keywords: ['رمان', 'pomegranate']
  },
  {
    id: 'fig',
    name: 'تين',
    icon: '🫐',
    keywords: ['تين', 'fig']
  },
  {
    id: 'grape',
    name: 'عنب',
    icon: '🍇',
    keywords: ['عنب', 'grape']
  },
  {
    id: 'lemon',
    name: 'ليمون',
    icon: '🍋',
    keywords: ['ليمون', 'lemon', 'حامض']
  },
  {
    id: 'peach',
    name: 'خوخ',
    icon: '🍑',
    keywords: ['خوخ', 'peach', 'دراق']
  },
  {
    id: 'other',
    name: 'أخرى',
    icon: '🌱',
    keywords: []
  }
];

const SECTION_COLOR = '#059669';

export function TreeCategorySlider({
  selectedCategory,
  onCategorySelect,
  availableCategories,
  onShowInfo
}: TreeCategorySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleCategories = TREE_CATEGORIES.filter(cat =>
    cat.id === 'all' || availableCategories.includes(cat.id)
  );

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      onCategorySelect(null);
    } else {
      onCategorySelect(categoryId === selectedCategory ? null : categoryId);
    }
  };

  if (visibleCategories.length <= 1) {
    return null;
  }

  return (
    <div className="w-full mb-4 mt-2" dir="rtl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto py-1.5 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overflowX: 'scroll',
            touchAction: 'pan-x',
          }}
        >
          {visibleCategories.map((category, index) => {
            const isSelected = category.id === 'all'
              ? selectedCategory === null
              : selectedCategory === category.id;

            return (
              <div key={category.id} className="contents">
                <button
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 ease-in-out hover:scale-105"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${SECTION_COLOR} 0%, ${SECTION_COLOR}dd 100%)`
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isSelected
                      ? `0 4px 12px ${SECTION_COLOR}50, inset 0 1px 0 rgba(255,255,255,0.2)`
                      : '0 2px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                    border: isSelected
                      ? `2px solid ${SECTION_COLOR}`
                      : '2px solid rgba(107, 107, 107, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      className="text-lg sm:text-xl transition-all duration-300"
                      style={{
                        filter: isSelected
                          ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) brightness(1.2)'
                          : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15)) grayscale(0.3)',
                        transform: isSelected ? 'scale(1.1) translateY(-1px)' : 'scale(1)',
                        display: 'inline-block',
                      }}
                    >
                      {category.icon}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-semibold whitespace-nowrap"
                      style={{
                        color: isSelected ? '#FFFFFF' : '#6B6B6B',
                        textShadow: isSelected ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
                      }}
                    >
                      {category.name}
                    </span>
                  </div>
                </button>

                {category.id === 'all' && onShowInfo && (
                  <button
                    key="info-button"
                    onClick={onShowInfo}
                    className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 ease-in-out hover:scale-105 animate-pulse"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.25) 100%)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)',
                      border: '2px solid rgba(34, 197, 94, 0.4)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-lg sm:text-xl">🌿</span>
                      <span
                        className="text-xs sm:text-sm font-semibold whitespace-nowrap"
                        style={{ color: '#15803d' }}
                      >
                        عن الاستثمار
                      </span>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export function getCategoryFromTreeType(treeType: string): string {
  const lowerType = treeType.toLowerCase();

  for (const category of TREE_CATEGORIES) {
    if (category.id === 'all' || category.id === 'other') continue;

    for (const keyword of category.keywords) {
      if (lowerType.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  return 'other';
}
