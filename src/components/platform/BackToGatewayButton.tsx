import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';

interface Props {
  position?: 'fixed' | 'static';
  className?: string;
}

export default function BackToGatewayButton({ position = 'fixed', className = '' }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/admin/gateway');
  };

  if (position === 'fixed') {
    return (
      <button
        onClick={handleClick}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 border-2 border-yellow-300 rounded-xl font-bold text-sm text-purple-900 shadow-lg hover:shadow-xl transition-all ${className}`}
        style={{
          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        }}
        title="العودة إلى بوابة الدخول الذكية"
      >
        <Crown className="w-4 h-4 text-yellow-600" />
        <span>بوابة الإدارة</span>
        <ArrowRight className="w-4 h-4 text-yellow-600" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 border-2 border-yellow-300 rounded-xl font-bold text-sm text-purple-900 shadow-md hover:shadow-lg transition-all ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}
      title="العودة إلى بوابة الدخول الذكية"
    >
      <Crown className="w-4 h-4 text-yellow-600" />
      <span>بوابة الإدارة</span>
      <ArrowRight className="w-4 h-4 text-yellow-600" />
    </button>
  );
}
