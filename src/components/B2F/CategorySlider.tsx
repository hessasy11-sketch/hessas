import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface InvestmentCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  count?: number;
}

interface CategorySliderProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onShowInfo: () => void;
}

export function CategorySlider({ selectedCategory, onCategorySelect, onShowInfo }: CategorySliderProps) {
  const [categories, setCategories] = useState<InvestmentCategory[]>([
    { id: 'palm', name: 'نخيل', icon: '🌴', color: 'from-amber-500 to-amber-600' },
    { id: 'olive', name: 'زيتون', icon: '🫒', color: 'from-green-600 to-green-700' },
    { id: 'mango', name: 'مانجا', icon: '🥭', color: 'from-orange-500 to-orange-600' },
    { id: 'banana', name: 'موز', icon: '🍌', color: 'from-yellow-500 to-yellow-600' },
    { id: 'other', name: 'أشجار أخرى', icon: '🌱', color: 'from-emerald-500 to-emerald-600' },
  ]);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategoryCounts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('category-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investment_opportunities'
        },
        () => {
          loadCategoryCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCategoryCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities_with_details')
        .select('tree_types, is_active')
        .eq('is_active', true);

      if (error) throw error;

      // Count opportunities by tree type
      const counts: Record<string, number> = {};
      data?.forEach((opp) => {
        // Each opportunity may have multiple tree types
        opp.tree_types?.forEach((treeType: string) => {
          const category = mapTreeTypeToCategory(treeType);
          counts[category] = (counts[category] || 0) + 1;
        });
      });

      // Update categories with counts
      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          count: counts[cat.id] || 0
        }))
      );
    } catch (error) {
      console.error('Error loading category counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapTreeTypeToCategory = (treeType: string): string => {
    const type = treeType.toLowerCase().trim();
    if (type.includes('نخ') || type === 'نخيل' || type.includes('palm')) return 'palm';
    if (type.includes('زيتون') || type === 'زيتون' || type.includes('olive')) return 'olive';
    if (type.includes('مانج') || type === 'مانجا' || type.includes('mango')) return 'mango';
    if (type.includes('موز') || type === 'موز' || type.includes('banana')) return 'banana';
    return 'other';
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll();
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategorySelect(null); // Deselect if already selected
    } else {
      onCategorySelect(categoryId);
    }
  };

  return (
    <div className="relative w-full mb-1" dir="rtl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="relative group">
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
              aria-label="السابق"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
              aria-label="التالي"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-1.5 px-1"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              overflowX: 'scroll',
              touchAction: 'pan-x'
            }}
          >
            {!selectedCategory ? (
              <>
                <button
                  onClick={onShowInfo}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300 animate-pulse"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.25) 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)',
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    color: '#15803d'
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">🌿</span>
                    <span>عن الاستثمار</span>
                  </span>
                </button>

                <button
                  onClick={() => onCategorySelect(null)}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: 'white'
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    🌳 جميع الأشجار
                  </span>
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300 relative"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      border: '1px solid rgba(107, 107, 107, 0.15)',
                      color: '#374151'
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                      {!loading && category.count !== undefined && category.count > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#059669'
                          }}
                        >
                          {category.count}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div className="flex gap-2 sm:gap-3 items-center">
                <button
                  onClick={onShowInfo}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.25) 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)',
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    color: '#15803d'
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">🌿</span>
                    <span>عن الاستثمار</span>
                  </span>
                </button>

                <button
                  onClick={() => onCategorySelect(null)}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    color: 'white'
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-lg">{categories.find(c => c.id === selectedCategory)?.icon}</span>
                    <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                    {!loading && categories.find(c => c.id === selectedCategory)?.count !== undefined && (
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)',
                          color: 'white'
                        }}
                      >
                        {categories.find(c => c.id === selectedCategory)?.count}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
