import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { tempSessionManager } from '../../utils/tempSessionManager';

export default function DevGateway() {
  const navigate = useNavigate();

  const handleEnter = () => {
    tempSessionManager.createSession();
    navigate('/hq');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-xl">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              بوابة التطوير
            </h1>
            <p className="text-blue-200">
              دخول مؤقت للإدارة (Development Mode)
            </p>
          </div>

          <button
            onClick={handleEnter}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xl font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            دخول الإدارة
          </button>

          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-200 text-sm text-center">
              ⚠️ هذا الدخول مؤقت لأغراض التطوير فقط
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
