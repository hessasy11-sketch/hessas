import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminEntryModalProps {
  onClose: () => void;
}

export default function AdminEntryModal({ onClose }: AdminEntryModalProps) {
  const navigate = useNavigate();

  const handleEnter = () => {
    navigate('/hq');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-4xl">👑</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            دخول الإدارة
          </h2>

          <p className="text-gray-600 mb-8 leading-relaxed">
            بوابة الإدارة العليا لمتابعة وتنظيم المنصة.
          </p>

          <button
            onClick={handleEnter}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3.5 rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            دخول لوحة الإدارة العليا
          </button>

          <p className="text-xs text-gray-400 mt-4">
            ⏳ الدخول مباشر الآن – تطوير الدخول لاحقًا
          </p>
        </div>
      </div>
    </div>
  );
}
