import { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HiddenAdminButton() {
  const [taps, setTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  const MAX_TAPS = 5;
  const TAP_TIMEOUT = 3000;

  useEffect(() => {
    if (taps >= MAX_TAPS) {
      setIsAnimating(true);
      setTimeout(() => {
        navigate('/');
        setTaps(0);
        setIsAnimating(false);
      }, 500);
    }
  }, [taps, navigate]);

  useEffect(() => {
    if (taps > 0 && taps < MAX_TAPS) {
      const timer = setTimeout(() => {
        setTaps(0);
      }, TAP_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [taps, lastTapTime]);

  const handleTap = () => {
    const now = Date.now();

    if (now - lastTapTime > TAP_TIMEOUT) {
      setTaps(1);
    } else {
      setTaps(prev => prev + 1);
    }

    setLastTapTime(now);

    const button = document.getElementById('hidden-admin-btn');
    if (button) {
      button.style.animation = 'none';
      setTimeout(() => {
        button.style.animation = 'pulse 0.3s ease';
      }, 10);
    }
  };

  const progress = (taps / MAX_TAPS) * 100;

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes spin-glow {
          0% { transform: rotate(0deg); filter: brightness(1); }
          50% { filter: brightness(1.5); }
          100% { transform: rotate(360deg); filter: brightness(1); }
        }
      `}</style>
      <button
        id="hidden-admin-btn"
        onClick={handleTap}
        className="relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: taps > 0
            ? `linear-gradient(135deg, rgba(251, 191, 36, ${0.15 + (taps * 0.12)}) 0%, rgba(245, 158, 11, ${0.15 + (taps * 0.12)}) 100%)`
            : 'transparent',
          border: taps > 0 ? '1.5px solid rgba(251, 191, 36, 0.4)' : 'none',
          boxShadow: taps > 0 ? `0 0 ${8 + (taps * 3)}px rgba(251, 191, 36, ${0.3 + (taps * 0.1)})` : 'none',
          animation: isAnimating ? 'spin-glow 0.5s ease-in-out' : 'none',
        }}
        aria-label="Admin Access"
      >
        {taps > 0 && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, #f59e0b ${progress}%, transparent ${progress}%)`,
              opacity: 0.3,
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
        <Crown
          className="w-3.5 h-3.5 relative z-10 transition-all duration-300"
          style={{
            color: taps === 0
              ? 'rgba(255, 255, 255, 0.3)'
              : taps >= MAX_TAPS
              ? '#fbbf24'
              : '#f59e0b',
            filter: taps > 0 ? `drop-shadow(0 0 ${3 + (taps * 2)}px rgba(251, 191, 36, ${0.5 + (taps * 0.1)}))` : 'none',
            transform: isAnimating ? 'scale(1.3) rotate(15deg)' : 'scale(1) rotate(0deg)',
          }}
        />
        {taps > 0 && taps < MAX_TAPS && (
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(245, 158, 11, 0.95) 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)',
              animation: 'pulse 0.3s ease',
            }}
          >
            {taps}/{MAX_TAPS}
          </div>
        )}
      </button>
    </>
  );
}
