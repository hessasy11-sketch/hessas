import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Modal } from './Modal';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  sellerName?: string;
}

export function RatingModal({ isOpen, onClose, onSubmit, sellerName }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('الرجاء اختيار التقييم');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('حدث خطأ في إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقييم البائع">
      <div className="space-y-4" dir="rtl">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            {sellerName ? `كيف كانت تجربتك مع ${sellerName}؟` : 'كيف كانت تجربتك مع البائع؟'}
          </p>

          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-all hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    value <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-500 mb-4">
            {rating === 0 && 'اختر التقييم'}
            {rating === 1 && 'سيء جداً'}
            {rating === 2 && 'سيء'}
            {rating === 3 && 'متوسط'}
            {rating === 4 && 'جيد'}
            {rating === 5 && 'ممتاز'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تعليق (اختياري)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="شارك تجربتك مع الآخرين..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 bg-emerald-500 text-white py-3 rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}
