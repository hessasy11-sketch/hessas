import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, ChevronDown, X, Search } from 'lucide-react';

interface Region {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  region_id: string;
}

interface RegionCitySliderProps {
  regions: Region[];
  cities: City[];
  selectedRegionId: string | null;
  selectedCityIds: string[];
  onSelectRegion: (regionId: string | null) => void;
  onSelectCities: (cityIds: string[]) => void;
  getCitiesByRegion: (regionId: string) => City[];
  getRegionById: (regionId: string) => Region | undefined;
}

export function RegionCitySlider({
  regions,
  selectedRegionId,
  selectedCityIds,
  onSelectRegion,
  onSelectCities,
  getCitiesByRegion,
  getRegionById,
}: RegionCitySliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showCitiesDropdown, setShowCitiesDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [selectedRegionId]);

  useEffect(() => {
    if (!showCitiesDropdown) {
      setSearchQuery('');
    }

    if (showCitiesDropdown && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showCitiesDropdown]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleRegionClick = (regionId: string) => {
    if (selectedRegionId === regionId) {
      onSelectRegion(null);
      onSelectCities([]);
    } else {
      onSelectRegion(regionId);
      onSelectCities([]);
    }
    setShowCitiesDropdown(false);
  };

  const handleCityToggle = (cityId: string) => {
    if (selectedCityIds.includes(cityId)) {
      onSelectCities(selectedCityIds.filter(id => id !== cityId));
    } else {
      onSelectCities([...selectedCityIds, cityId]);
    }
  };

  const handleSelectAllCities = () => {
    if (!selectedRegionId) return;
    const regionCities = getCitiesByRegion(selectedRegionId);
    onSelectCities(regionCities.map(c => c.id));
  };

  const handleDeselectAllCities = () => {
    onSelectCities([]);
  };

  const selectedRegion = selectedRegionId ? getRegionById(selectedRegionId) : null;
  const regionCities = selectedRegionId ? getCitiesByRegion(selectedRegionId) : [];

  const filteredCities = regionCities.filter(city =>
    city.name_ar.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCityDisplayText = () => {
    if (selectedCityIds.length === 0) return 'جميع المدن';
    if (selectedCityIds.length === 1) {
      const city = regionCities.find(c => c.id === selectedCityIds[0]);
      return city?.name_ar || '';
    }
    if (selectedCityIds.length === regionCities.length) return 'جميع المدن';
    return `${selectedCityIds.length} مدينة`;
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
            {!selectedRegionId ? (
              <>
                <button
                  onClick={() => onSelectRegion(null)}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #3AA556 0%, #2d8a45 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(58, 165, 86, 0.3)',
                    border: '1px solid rgba(58, 165, 86, 0.2)',
                    color: 'white'
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    🌍 جميع المناطق
                  </span>
                </button>

                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleRegionClick(region.id)}
                    className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      border: '1px solid rgba(107, 107, 107, 0.15)',
                      color: '#374151'
                    }}
                  >
                    {region.name_ar}
                  </button>
                ))}
              </>
            ) : (
              <div className="flex gap-2 sm:gap-3 items-center">
                <button
                  onClick={() => {
                    onSelectRegion(null);
                    onSelectCities([]);
                    setShowCitiesDropdown(false);
                  }}
                  className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #3AA556 0%, #2d8a45 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(58, 165, 86, 0.3)',
                    border: '1px solid rgba(58, 165, 86, 0.2)',
                    color: 'white'
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedRegion?.name_ar}</span>
                    <X className="w-3.5 h-3.5" />
                  </div>
                </button>

                <button
                  onClick={() => setShowCitiesDropdown(!showCitiesDropdown)}
                  className="flex-shrink-0 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{
                    padding: selectedCityIds.length > 1 ? '0.625rem 1.5rem' : '0.5rem 1.25rem',
                    fontSize: selectedCityIds.length > 1 ? '0.9375rem' : '0.875rem',
                    background: showCitiesDropdown
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'rgba(59, 130, 246, 0.15)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: showCitiesDropdown
                      ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                      : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: showCitiesDropdown ? 'white' : '#2563eb',
                    transform: selectedCityIds.length > 1 ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span>مدن {selectedRegion?.name_ar}</span>
                    {selectedCityIds.length > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{
                          background: showCitiesDropdown ? 'rgba(255, 255, 255, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                          color: showCitiesDropdown ? 'white' : '#1e40af'
                        }}
                      >
                        {getCityDisplayText()}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showCitiesDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCitiesDropdown && selectedRegionId && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
              backdropFilter: 'blur(12px)',
              animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={() => setShowCitiesDropdown(false)}
          />

          <div
            className="fixed inset-4 md:absolute md:left-0 md:right-0 md:top-full md:inset-auto z-50 flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
              borderRadius: '24px',
              maxHeight: 'calc(100vh - 32px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100" style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(248,250,252,0.95))',
              backdropFilter: 'blur(20px)'
            }}>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}>
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      مدن {selectedRegion?.name_ar}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {filteredCities.length} مدينة متاحة
                      {selectedCityIds.length > 0 && (
                        <span className="inline-flex items-center mr-2 px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: 'white'
                        }}>
                          {selectedCityIds.length} مختارة
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCitiesDropdown(false)}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:rotate-90"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3 bg-white/50 border-b border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllCities}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ✓ تحديد الكل
                </button>
                <button
                  onClick={handleDeselectAllCities}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  × إلغاء الكل
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3 bg-white/30">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مدينة بالاسم..."
                  className="w-full pr-12 pl-4 py-3.5 rounded-xl text-sm font-medium focus:outline-none transition-all duration-200"
                  style={{
                    background: 'white',
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    color: '#1f2937'
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '2px solid #3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '2px solid rgba(59, 130, 246, 0.2)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#3b82f6 #e5e7eb'
              }}
            >

              <div className="px-5 pt-5 pb-24">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCities.map((city) => {
                    const isSelected = selectedCityIds.includes(city.id);
                    return (
                      <button
                        key={city.id}
                        onClick={() => handleCityToggle(city.id)}
                        className={`
                          group relative px-4 py-4 rounded-2xl font-bold text-sm
                          transition-all duration-300
                          ${isSelected ? 'text-white scale-105' : 'text-gray-700 hover:scale-105'}
                        `}
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          boxShadow: isSelected
                            ? '0 8px 24px rgba(59, 130, 246, 0.4), 0 4px 8px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                            : '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                          border: isSelected
                            ? '2px solid rgba(255, 255, 255, 0.3)'
                            : '2px solid rgba(226, 232, 240, 0.8)',
                          transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                        }}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                            animation: 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                          }}>
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <span className="block truncate text-center">{city.name_ar}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredCities.length === 0 && (
                <div className="flex-1 flex items-center justify-center px-5 py-12">
                  <div className="text-center max-w-sm">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)'
                    }}>
                      <Search className="w-12 h-12 text-blue-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      لم نجد نتائج
                    </h4>
                    <p className="text-gray-600 text-sm mb-6">
                      لا توجد مدن تطابق &quot;<span className="font-bold text-blue-600">{searchQuery}</span>&quot;
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      مسح البحث والمحاولة مرة أخرى
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-gray-100" style={{
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <button
                onClick={() => setShowCitiesDropdown(false)}
                className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {selectedCityIds.length > 0 && (
                    <div className="px-2.5 py-0.5 rounded-full bg-white/30 backdrop-blur-sm text-sm font-bold">
                      {selectedCityIds.length}
                    </div>
                  )}
                  تطبيق الاختيار
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 768px) {
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        }
      `}</style>
    </div>
  );
}
