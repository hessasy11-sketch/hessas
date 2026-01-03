import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { AuctionCard } from './AuctionCard';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface AuctionSliderProps {
  title: string;
  auctions: Auction[];
  color?: string;
  icon?: string;
  onAuctionClick: (auction: Auction) => void;
}

export function AuctionSlider({ title, auctions, color = '#10b981', icon, onAuctionClick }: AuctionSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const updateArrows = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollLeft > 5);
      setShowLeftArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    updateArrows();
    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', updateArrows);
      window.addEventListener('resize', updateArrows);
      return () => {
        element.removeEventListener('scroll', updateArrows);
        window.removeEventListener('resize', updateArrows);
      };
    }
  }, [auctions]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (auctions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 md:mb-10" dir="rtl">
      <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 w-1 h-full rounded-r-full"
          style={{ backgroundColor: color }}
        />

        <div className="flex justify-between items-center mb-4 md:mb-5">
          <div className="flex items-center gap-2 md:gap-3">
            {icon && (
              <div className="text-3xl md:text-4xl animate-pulse" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}>
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                {title}
                <span
                  className="text-xs md:text-sm font-bold px-3 py-1 rounded-full text-white shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {auctions.length} مزاد
                </span>
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                <span>اكتشف أفضل العروض</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll('right')}
              disabled={!showRightArrow}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
                showRightArrow
                  ? 'bg-white hover:bg-gray-50 border-2 hover:shadow-xl hover:scale-110'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
              style={{
                borderColor: showRightArrow ? color : undefined,
                color: showRightArrow ? color : undefined,
              }}
              aria-label="السابق"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll('left')}
              disabled={!showLeftArrow}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 ${
                showLeftArrow
                  ? 'bg-white hover:bg-gray-50 border-2 hover:shadow-xl hover:scale-110'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
              style={{
                borderColor: showLeftArrow ? color : undefined,
                color: showLeftArrow ? color : undefined,
              }}
              aria-label="التالي"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="relative group">
          {showRightArrow && (
            <div
              className="hidden md:block absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to left, white, transparent)`,
              }}
            />
          )}
          {showLeftArrow && (
            <div
              className="hidden md:block absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to right, white, transparent)`,
              }}
            />
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth pb-2 snap-x snap-mandatory touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {auctions.map((auction) => (
              <div key={auction.id} className="snap-start">
                <AuctionCard
                  auction={auction}
                  onClick={() => onAuctionClick(auction)}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1.5 rounded-full blur-sm opacity-50"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
