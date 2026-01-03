import { useState, useEffect } from 'react';
import { Search, X, Clock, ArrowRight, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRegionsAndCities } from '../hooks/useRegionsAndCities';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface SearchPageProps {
  onClose: () => void;
  onAuctionClick: (auction: Auction) => void;
}

export function SearchPage({ onClose, onAuctionClick }: SearchPageProps) {
  const { regions, getCitiesByRegion, getRegionById, getCityById } = useRegionsAndCities();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [searchResults, setSearchResults] = useState<Auction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const searchAuctions = async () => {
      setIsSearching(true);

      try {
        let query = supabase
          .from('auctions')
          .select('*')
          .eq('section', 'companies')
          .eq('status', 'active');

        if (searchQuery.trim().length >= 2) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        if (selectedRegionId && !selectedCityId) {
          query = query.eq('region_id', selectedRegionId);
        }

        if (selectedCityId) {
          query = query.eq('city_id', selectedCityId);
        }

        query = query
          .order('priority_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50);

        const { data, error } = await query;

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchAuctions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedRegionId, selectedCityId]);

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleAuctionClick = (auction: Auction) => {
    handleSearch();
    onAuctionClick(auction);
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-white flex-1">البحث</h2>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث عن مزاد..."
            autoFocus
            className="w-full pr-12 pl-12 py-3 rounded-xl text-base bg-white/95 backdrop-blur-sm border-2 border-white/30 focus:border-white focus:ring-2 focus:ring-white/50 transition-all outline-none shadow-lg"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
            {isSearching ? (
              <div className="animate-spin">
                <Clock className="w-5 h-5" />
              </div>
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
            <select
              value={selectedRegionId}
              onChange={(e) => {
                setSelectedRegionId(e.target.value);
                setSelectedCityId('');
              }}
              className="w-full pr-10 pl-3 py-2.5 rounded-lg text-sm bg-white/95 backdrop-blur-sm border-2 border-white/30 focus:border-white focus:ring-2 focus:ring-white/50 transition-all outline-none shadow-md appearance-none cursor-pointer"
            >
              <option value="">كل المناطق</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              disabled={!selectedRegionId}
              className="w-full pr-10 pl-3 py-2.5 rounded-lg text-sm bg-white/95 backdrop-blur-sm border-2 border-white/30 focus:border-white focus:ring-2 focus:ring-white/50 transition-all outline-none shadow-md appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">كل المدن</option>
              {selectedRegionId && getCitiesByRegion(selectedRegionId).map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isSearching && searchQuery === '' && !selectedRegionId && searchResults.length > 0 && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              جميع المزادات النشطة ({searchResults.length})
            </p>
            <div className="space-y-3">
              {searchResults.map((auction) => (
                <button
                  key={auction.id}
                  onClick={() => handleAuctionClick(auction)}
                  className="w-full flex items-start gap-4 p-4 bg-white hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-gray-100 hover:border-emerald-200 active:scale-[0.98]"
                >
                  {auction.image_url ? (
                    <img
                      src={auction.image_url}
                      alt={auction.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <span className="text-3xl">🌾</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2">
                      {auction.title}
                    </h3>
                    {auction.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {auction.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold text-emerald-600">
                        {auction.current_price?.toLocaleString('ar-SA')} ريال
                      </span>
                      {auction.status === 'active' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          نشط
                        </span>
                      )}
                      {(auction.region_id || auction.city_id) && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          <MapPin className="w-3 h-3" />
                          {auction.city_id && getCityById(auction.city_id) ? (
                            <span>
                              {getRegionById(auction.region_id!)?.name_ar} - {getCityById(auction.city_id)?.name_ar}
                            </span>
                          ) : auction.region_id && getRegionById(auction.region_id) ? (
                            <span>{getRegionById(auction.region_id)?.name_ar}</span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!searchQuery && !selectedRegionId && recentSearches.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">عمليات البحث الأخيرة</h3>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                مسح الكل
              </button>
            </div>
            <div className="space-y-2">
              {recentSearches.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(query)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-right"
                >
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{query}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching && searchQuery && (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-base font-medium">جاري البحث...</p>
          </div>
        )}

        {!isSearching && (searchQuery || selectedRegionId) && searchResults.length > 0 && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              {searchResults.length} نتيجة
              {selectedRegionId && selectedCityId && ` في ${getCityById(selectedCityId)?.name_ar}`}
              {selectedRegionId && !selectedCityId && ` في ${getRegionById(selectedRegionId)?.name_ar}`}
            </p>
            <div className="space-y-3">
              {searchResults.map((auction) => (
                <button
                  key={auction.id}
                  onClick={() => handleAuctionClick(auction)}
                  className="w-full flex items-start gap-4 p-4 bg-white hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-gray-100 hover:border-emerald-200 active:scale-[0.98]"
                >
                  {auction.image_url ? (
                    <img
                      src={auction.image_url}
                      alt={auction.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <span className="text-3xl">🌾</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2">
                      {auction.title}
                    </h3>
                    {auction.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {auction.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold text-emerald-600">
                        {auction.current_price?.toLocaleString('ar-SA')} ريال
                      </span>
                      {auction.status === 'active' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          نشط
                        </span>
                      ) : auction.status === 'sold' ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          مباع
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          منتهي
                        </span>
                      )}
                      {(auction.region_id || auction.city_id) && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          <MapPin className="w-3 h-3" />
                          {auction.city_id && getCityById(auction.city_id) ? (
                            <span>
                              {getRegionById(auction.region_id!)?.name_ar} - {getCityById(auction.city_id)?.name_ar}
                            </span>
                          ) : auction.region_id && getRegionById(auction.region_id) ? (
                            <span>{getRegionById(auction.region_id)?.name_ar}</span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isSearching && (searchQuery.length >= 2 || selectedRegionId || selectedCityId) && searchResults.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-base font-bold mb-2">لا توجد نتائج</p>
            <p className="text-sm text-gray-400">جرب كلمات بحث أخرى</p>
          </div>
        )}

        {!searchQuery && recentSearches.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="text-base font-bold mb-2 text-gray-700">ابحث عن مزاد</p>
            <p className="text-sm text-gray-400">اكتب كلمة البحث للعثور على المزادات</p>
          </div>
        )}
      </div>
    </div>
  );
}
