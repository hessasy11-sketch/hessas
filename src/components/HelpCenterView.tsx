import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Send, ThumbsUp, ThumbsDown, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import { useHelpCenter } from '../hooks/useHelpCenter';

interface HelpCenterViewProps {
  onBack: () => void;
}

export function HelpCenterView({ onBack }: HelpCenterViewProps) {
  const { messages, sending, sendMessage, startNewSession, tickets } = useHelpCenter();
  const [view, setView] = useState<'welcome' | 'chat' | 'tickets'>('welcome');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const success = await sendMessage(inputMessage, selectedCategory || undefined);
    if (success) {
      setInputMessage('');
    }
  };

  const handleCategoryClick = (category: string, categoryAr: string) => {
    setSelectedCategory(category);
    setView('chat');
    startNewSession();
    setTimeout(() => {
      sendMessage(`أريد معرفة عن ${categoryAr}`, category);
    }, 500);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('مرحباً، أحتاج مساعدة من منصة حصص زراعية للاستثمار 🌿');
    window.open(`https://wa.me/966XXXXXXXXX?text=${message}`, '_blank');
  };

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50" dir="rtl">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
          <button
            onClick={onBack}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              مركز المساعدة الزراعي الذكي
            </h2>
            <p className="text-sm text-white/90 mt-1">مساعدك الزراعي على مدار الساعة</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 pb-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-green-200">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-5xl">🤖</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                يا هلا 👋 أنا مساعد حصص زراعية للاستثمار
              </h3>
              <p className="text-gray-600 text-lg">
                هل تحتاج أشرح لك طريقة النشر؟ أو طريقة الدفع؟
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => handleCategoryClick('publishing', 'طريقة نشر مزاد')}
                className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 p-6 rounded-xl border-2 border-blue-200 transition-all hover:scale-105"
              >
                <div className="text-5xl mb-3">🪴</div>
                <div className="font-bold text-gray-800 text-lg">طريقة نشر مزاد</div>
                <div className="text-sm text-gray-600 mt-2">اعرض منتجاتك الزراعية</div>
              </button>

              <button
                onClick={() => handleCategoryClick('payment', 'الدفع والعمولات')}
                className="bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 p-6 rounded-xl border-2 border-yellow-200 transition-all hover:scale-105"
              >
                <div className="text-5xl mb-3">💰</div>
                <div className="font-bold text-gray-800 text-lg">الدفع والعمولات</div>
                <div className="text-sm text-gray-600 mt-2">كيفية الدفع والسحب</div>
              </button>

              <button
                onClick={() => handleCategoryClick('tracking', 'تتبع الإيصال البنكي')}
                className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 p-6 rounded-xl border-2 border-green-200 transition-all hover:scale-105"
              >
                <div className="text-5xl mb-3">🧾</div>
                <div className="font-bold text-gray-800 text-lg">تتبع الإيصال</div>
                <div className="text-sm text-gray-600 mt-2">متابعة إيصالاتك</div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setView('chat')}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all"
              >
                💬 ابدأ محادثة جديدة
              </button>
              <button
                onClick={() => setView('tickets')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-4 rounded-xl font-bold text-lg transition-all"
              >
                📋 طلباتي السابقة
              </button>
            </div>
          </div>

          <button
            onClick={openWhatsApp}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            تحتاج رد سريع؟ تواصل عبر واتساب
          </button>
        </div>
      </div>
    );
  }

  if (view === 'tickets') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50" dir="rtl">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
          <button
            onClick={() => setView('welcome')}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6" />
              تتبع طلبات المساعدة
            </h2>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 pb-20">
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600 text-lg">لا توجد طلبات مساعدة حالياً</p>
              <button
                onClick={() => setView('chat')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold"
              >
                ابدأ محادثة جديدة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono font-bold text-blue-600">{ticket.ticket_number}</div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ticket.status === 'resolved' ? 'تم الحل ✅' :
                       ticket.status === 'in_progress' ? 'قيد المعالجة ⏳' :
                       'جديد 🆕'}
                    </div>
                  </div>
                  <div className="font-bold text-gray-800 mb-2">{ticket.subject}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex flex-col" dir="rtl">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center gap-3 shadow-lg">
        <button
          onClick={() => {
            startNewSession();
            setView('welcome');
          }}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🤖 مساعدك الزراعي الذكي
          </h2>
          <p className="text-sm text-white/90">متاح على مدار الساعة</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="bg-green-100 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🌾</div>
              <p className="text-green-800 font-medium">
                يا هلا! أنا مساعدك الزراعي الذكي. كيف أقدر أساعدك اليوم؟
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.sender_type === 'user'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.message}</div>
                <div className={`text-xs mt-1 ${
                  msg.sender_type === 'user' ? 'text-gray-500' : 'text-white/70'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t-2 border-gray-200 p-4 fixed bottom-0 left-0 right-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب سؤالك الزراعي..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={openWhatsApp}
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              🔄 تحويل إلى واتساب للرد السريع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
