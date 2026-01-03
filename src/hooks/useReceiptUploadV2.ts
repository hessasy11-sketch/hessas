import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UploadReceiptParams {
  requestId: string;
  file: File;
  expectedAmount: number;
}

interface UploadReceiptResult {
  success: boolean;
  newStatus: string;
  receiptUrl?: string;
  error?: string;
}

export function useReceiptUploadV2() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadReceipt = async ({
    requestId,
    file,
    expectedAmount
  }: UploadReceiptParams): Promise<UploadReceiptResult> => {
    setUploading(true);
    setProgress(0);

    try {
      // 1. التحقق من نوع الملف
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('يرجى رفع صورة (JPG, PNG, WEBP) أو ملف PDF فقط');
      }

      // 2. التحقق من حجم الملف (أقل من 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
      }

      setProgress(20);

      // 3. رفع الملف إلى Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${requestId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('b2f-payment-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw new Error(`فشل رفع الملف: ${uploadError.message}`);
      }

      setProgress(50);

      // 4. الحصول على الرابط العام
      const { data: { publicUrl } } = supabase.storage
        .from('b2f-payment-receipts')
        .getPublicUrl(filePath);

      setProgress(70);

      // 5. تحديث قاعدة البيانات بالحالة الجديدة
      const { data: updateData, error: updateError } = await supabase
        .from('b2f_sales_requests')
        .update({
          payment_receipt_url: publicUrl,
          status: 'receipt_uploaded',
          receipt_uploaded_at: new Date().toISOString(),
          expected_amount: expectedAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        // في حالة فشل التحديث، نحذف الملف المرفوع
        await supabase.storage
          .from('b2f-payment-receipts')
          .remove([filePath]);

        throw new Error(`فشل تحديث حالة الطلب: ${updateError.message}`);
      }

      setProgress(90);

      // 6. استدعاء Edge Function للتحليل بالذكاء الصناعي (اختياري - لا يؤثر على النجاح)
      try {
        await supabase.functions.invoke('analyze-b2f-payment-receipt', {
          body: {
            request_id: requestId,
            receipt_url: publicUrl
          }
        });
      } catch (aiError) {
        console.warn('AI analysis failed (non-critical):', aiError);
      }

      setProgress(100);

      return {
        success: true,
        newStatus: 'receipt_uploaded',
        receiptUrl: publicUrl
      };

    } catch (error: any) {
      console.error('Receipt upload error:', error);
      return {
        success: false,
        newStatus: 'payment_open',
        error: error.message || 'حدث خطأ أثناء رفع الإيصال'
      };
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploading,
    progress,
    uploadReceipt
  };
}
