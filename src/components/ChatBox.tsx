import { useState } from 'react';
import { Send, Zap, Crown, TrendingUp } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';

interface ChatBoxProps {
  auctionId: string;
  currentPrice: number;
  isClosed?: boolean;
}

function containsPhoneNumber(text: string): boolean {
  const patterns = [
    /\d{9,}/,
    /05\d{8}/,
    /\+966\d{9}/,
    /966\d{9}/,
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function extractPrice(text: string): number | null {
  const match = text.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

export function ChatBox({ auctionId, currentPrice, isClosed = false }: ChatBoxProps) {
  const { messages, loading, sendMessage, messagesEndRef } = useChat(auctionId);
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [showGuestModal, setShowGuestModal] = useState(false);

  const bids = messages
    .filter(msg => extractPrice(msg.message) !== null)
    .map(msg => ({
      ...msg,
      price: extractPrice(msg.message) || 0
    }))
    .sort((a, b) => b.price - a.price);

  const topBid = bids[0]?.price || currentPrice;
  const myBids = bids.filter(b => b.sender_id === user?.id);
  const myTopBid = myBids[0]?.price || 0;
  const isLeader = myTopBid > 0 && myTopBid === topBid;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || isClosed) return;

    if (!user) {
      setShowGuestModal(true);
      return;
    }

    setError('');

    if (containsPhoneNumber(newMessage)) {
      setError('ممنوع إدخال أرقام الجوال');
      return;
    }

    const proposedPrice = extractPrice(newMessage);
    if (proposedPrice !== null && proposedPrice <= currentPrice) {
      setError(`السعر يجب أن يكون أكبر من ${currentPrice.toLocaleString('ar-SA')}`);
      return;
    }

    setSending(true);
    try {
      await sendMessage(newMessage, user.id);
      setNewMessage('');
      setError('');
    } catch (error) {
      console.error('Error:', error);
      setError('حدث خطأ');
    } finally {
      setSending(false);
    }
  };

  const quickBid = (amount: number) => {
    setNewMessage(`${topBid + amount} ريال`);
  };

  const handleGuestRegistrationSuccess = async (userId: string) => {
    setShowGuestModal(false);
    if (newMessage.trim()) {
      setSending(true);
      try {
        await sendMessage(newMessage, userId);
        setNewMessage('');
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <>
      <div className="space-y-4" dir="rtl">
        {isLeader && (
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-4 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="w-5 h-5" />
              <span className="font-bold text-lg">أنت الأعلى الآن!</span>
            </div>
            <p className="text-yellow-100 text-sm">عرضك: {myTopBid.toLocaleString('ar-SA')} ر.س</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => quickBid(100)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-lg transition-all border-2 border-emerald-200"
          >
            <div className="text-xs mb-1">+100</div>
            <div className="text-sm">{(topBid + 100).toLocaleString('ar-SA')}</div>
          </button>
          <button
            onClick={() => quickBid(500)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-lg transition-all border-2 border-blue-200"
          >
            <div className="text-xs mb-1">+500</div>
            <div className="text-sm">{(topBid + 500).toLocaleString('ar-SA')}</div>
          </button>
          <button
            onClick={() => quickBid(1000)}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-3 rounded-lg transition-all border-2 border-purple-200"
          >
            <div className="text-xs mb-1">+1000</div>
            <div className="text-sm">{(topBid + 1000).toLocaleString('ar-SA')}</div>
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-white border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">أعلى عرض حالي</div>
                <div className="text-2xl font-black text-emerald-600">
                  {topBid.toLocaleString('ar-SA')} ر.س
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">عدد العروض</div>
                <div className="text-xl font-bold text-gray-700">{bids.length}</div>
              </div>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-4 space-y-2 bg-white">
            {loading ? (
              <div className="text-center text-gray-500 py-8">جاري التحميل...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">كن أول من يزايد!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const msgPrice = extractPrice(msg.message);
                const isBid = msgPrice !== null;
                const isMyMessage = msg.sender_id === user?.id;
                const isTopBidder = isBid && msgPrice === topBid;

                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      isMyMessage
                        ? 'bg-emerald-100 border-2 border-emerald-300 ml-8'
                        : 'bg-gray-100 border border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isMyMessage ? 'text-emerald-800' : 'text-gray-700'}`}>
                          {msg.sender?.display_name || 'مجهول'}
                        </span>
                        {isTopBidder && (
                          <Crown className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className={`font-medium ${isBid ? 'text-lg' : 'text-sm'} ${
                      isMyMessage ? 'text-emerald-900' : 'text-gray-800'
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isClosed || sending || !newMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isClosed ? 'المزايدة مغلقة' : 'اكتب عرضك... (مثال: 5000 ريال)'}
              disabled={isClosed || sending}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">نصائح للمزايدة:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>استخدم الأزرار السريعة للمزايدة بسرعة</li>
                <li>ممنوع كتابة أرقام الجوال في المزايدة</li>
                <li>يجب أن يكون عرضك أعلى من السعر الحالي</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
