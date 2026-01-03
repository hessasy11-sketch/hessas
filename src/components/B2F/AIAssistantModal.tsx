import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Sparkles, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  investorPhone: string;
}

export default function AIAssistantModal({ isOpen, onClose, investorPhone }: AIAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'كيف أحجز أشجار؟',
    'ما هي حالات الطلب؟',
    'كيف أرفع إيصال الدفع؟',
    'أين أجد حجوزاتي؟',
    'متى أستلم العقد؟',
  ];

  useEffect(() => {
    if (isOpen) {
      loadConversation();
      loadNotifications();
    }
  }, [isOpen, investorPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const { data: conversations } = await supabase
        .from('b2f_ai_conversations')
        .select('id')
        .eq('investor_phone', investorPhone)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        const convId = conversations[0].id;
        setConversationId(convId);

        const { data: msgs } = await supabase
          .from('b2f_ai_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (msgs) {
          setMessages(msgs);
        }
      } else {
        const welcomeMsg: Message = {
          id: 'welcome',
          role: 'assistant',
          content: 'مرحباً بك في المساعد الذكي لاستثمار أشجار المزارع! 🌳\n\nأنا هنا لمساعدتك في:\n• فهم حالات الطلبات\n• معرفة خطوات الحجز\n• الإجابة على أسئلتك\n\nاختر أحد الأسئلة المقترحة أو اكتب سؤالك الخاص.',
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('b2f_ai_system_notifications')
        .select('*')
        .eq('investor_phone', investorPhone)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    setLoading(true);
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('b2f-ai-assistant', {
        body: {
          conversation_id: conversationId,
          investor_phone: investorPhone,
          message: messageText,
        },
      });

      if (error) throw error;

      if (data && data.success) {
        setConversationId(data.conversation_id);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('b2f_ai_system_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_approved':
        return '💰';
      case 'season_started':
        return '🌱';
      case 'harvest_ready':
        return '🍎';
      case 'certificate_issued':
        return '📜';
      case 'visit_approved':
        return '✅';
      case 'contract_issued':
        return '📋';
      default:
        return '📢';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl sm:max-h-[80vh] max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">المساعد الذكي</h3>
              <p className="text-xs text-green-100">مساعدك في استثمار الأشجار</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
            >
              <MessageCircle className="w-5 h-5" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showNotifications ? (
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              إشعارات النظام
            </h4>
            {notifications.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationAsRead(notification.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      notification.is_read
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.notification_type)}</span>
                      <div className="flex-1">
                        <h5 className="font-bold text-sm">{notification.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-green-600 text-white'
                        : message.role === 'system'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 text-center mb-3">أسئلة مقترحة:</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionClick(question)}
                      className="w-full text-right p-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 text-sm transition flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{question}</span>
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage(inputMessage)}
                  placeholder="اكتب سؤالك هنا..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || loading}
                  className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
