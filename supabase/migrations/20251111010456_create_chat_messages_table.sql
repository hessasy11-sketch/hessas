/*
  # إنشاء جدول الرسائل (Chat Messages)

  1. الجداول الجديدة
    - `chat_messages`
      - `id` (uuid, primary key)
      - `auction_id` (uuid, foreign key to auctions)
      - `sender_id` (uuid, foreign key to profiles)
      - `message` (text)
      - `created_at` (timestamptz)
      
  2. الأمان
    - تفعيل RLS على جدول chat_messages
    - سياسة للقراءة: جميع المستخدمين المسجلين
    - سياسة للكتابة: جميع المستخدمين المسجلين
    - سياسة للحذف: فقط صاحب الرسالة
    
  3. الفهارس
    - فهرس على auction_id للاستعلامات السريعة
    - فهرس على created_at للترتيب
*/

-- إنشاء جدول الرسائل
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_chat_messages_auction_id ON chat_messages(auction_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- تفعيل RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: جميع المستخدمين المسجلين
CREATE POLICY "Authenticated users can view all messages"
ON chat_messages
FOR SELECT
TO authenticated
USING (true);

-- سياسة الكتابة: جميع المستخدمين المسجلين
CREATE POLICY "Authenticated users can send messages"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- سياسة الحذف: فقط صاحب الرسالة
CREATE POLICY "Users can delete own messages"
ON chat_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);
