import { useRef } from 'react';

interface Category {
  id: string;
  name_ar: string;
  icon: string;
}

interface CategorySliderProps {
  categories: Category[];
  activeCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  sectionColor: string;
}

export function CategorySlider({
  categories,
  activeCategory,
  onCategorySelect,
  sectionColor,
}: CategorySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full mb-1" dir="rtl">
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
          <button
            onClick={() => onCategorySelect(null)}
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center"
            style={{
              background: activeCategory === null
                ? sectionColor
                : 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              boxShadow: activeCategory === null
                ? `0 2px 8px ${sectionColor}40`
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(107, 107, 107, 0.15)',
            }}
          >
            <span
              className="text-lg sm:text-xl"
              style={{
                filter: activeCategory === null ? 'brightness(1.2)' : 'grayscale(0.5)',
              }}
            >
              🏠
            </span>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 ease-in-out"
              style={{
                background: activeCategory === category.id
                  ? sectionColor
                  : 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px)',
                boxShadow: activeCategory === category.id
                  ? `0 2px 8px ${sectionColor}40`
                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(107, 107, 107, 0.15)',
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="text-base sm:text-lg"
                  style={{
                    filter: activeCategory === category.id ? 'brightness(1.2)' : 'grayscale(0.5)',
                  }}
                >
                  {category.icon}
                </span>
                <span
                  className="text-xs sm:text-sm font-semibold whitespace-nowrap"
                  style={{
                    color: activeCategory === category.id ? '#FFFFFF' : '#6B6B6B',
                    textShadow: activeCategory === category.id ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
                  }}
                >
                  {category.name_ar}
                </span>
              </div>
            </button>
          ))}
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
