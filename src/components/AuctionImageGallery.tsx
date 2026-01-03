import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Play } from 'lucide-react';

interface AuctionImageGalleryProps {
  images: string[];
  title: string;
  videoUrl?: string;
}

export function AuctionImageGallery({ images, title, videoUrl }: AuctionImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);

  const allMedia = videoUrl ? [{ type: 'video', url: videoUrl }, ...images.map(img => ({ type: 'image', url: img }))] : images.map(img => ({ type: 'image', url: img }));
  const currentMedia = allMedia[currentIndex];
  const thumbnailsToShow = showAllThumbnails ? allMedia : allMedia.slice(0, 3);

  if (allMedia.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-2">📷</div>
          <p className="text-gray-500 text-sm">لا توجد صور</p>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video group">
          {currentMedia?.type === 'video' ? (
            <video
              src={currentMedia.url}
              controls
              className="w-full h-full object-cover"
              poster={images[0]}
            >
              المتصفح لا يدعم عرض الفيديو
            </video>
          ) : (
            <img
              src={currentMedia?.url || images[0]}
              alt={`${title} - صورة ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
          )}

          {currentMedia?.type === 'image' && (
            <button
              onClick={() => setShowFullscreen(true)}
              className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              title="عرض كامل"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          )}

          {allMedia.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-white text-sm font-medium">
                {currentIndex + 1} / {allMedia.length}
              </div>
            </>
          )}
        </div>

        {allMedia.length > 1 && (
          <div className="space-y-2">
            <div className="flex gap-2 overflow-hidden">
              {thumbnailsToShow.map((media, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-4 ring-emerald-500 scale-105'
                      : 'ring-2 ring-gray-200 hover:ring-gray-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  {media.type === 'video' ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  ) : (
                    <img
                      src={media.url}
                      alt={`معاينة ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}

              {!showAllThumbnails && allMedia.length > 3 && (
                <button
                  onClick={() => setShowAllThumbnails(true)}
                  className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm transition-all"
                >
                  +{allMedia.length - 3}
                </button>
              )}
            </div>

            {showAllThumbnails && allMedia.length > 3 && (
              <button
                onClick={() => setShowAllThumbnails(false)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                إخفاء
              </button>
            )}
          </div>
        )}
      </div>

      {showFullscreen && currentMedia?.type === 'image' && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={currentMedia.url}
            alt={`${title} - عرض كامل`}
            className="max-w-full max-h-full object-contain p-4"
          />

          {allMedia.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg"
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white font-medium">
                {currentIndex + 1} / {allMedia.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
