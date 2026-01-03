import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 3 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    if (images.length >= maxImages) {
      setError(`الحد الأقصى ${maxImages} صور`);
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setError('');
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          setError('يرجى اختيار ملف صورة فقط');
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { data, error: uploadError } = await supabase.storage
          .from('opportunity-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('opportunity-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index];

    try {
      const path = imageUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('opportunity-images')
          .remove([path]);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
    }

    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-600" />
          صور العرض (حتى {maxImages} صور)
        </h3>
        <span className="text-sm text-gray-500">
          {images.length} / {maxImages}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={url}
                alt={`صورة ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>

            {index === 0 && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
                رئيسية
              </div>
            )}

            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs font-semibold">رفع صورة</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• الصورة الأولى تُستخدم كصورة رئيسية</li>
          <li>• الصيغ المسموحة: JPG, PNG, WEBP</li>
          <li>• الحد الأقصى: 5 ميجابايت لكل صورة</li>
          <li>• يُنصح باستخدام صور واضحة وجذابة</li>
        </ul>
      </div>
    </div>
  );
}
