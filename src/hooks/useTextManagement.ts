import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TextItem {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  supports_placeholders: boolean;
  created_at: string;
  updated_at: string;
}

interface TextCache {
  [key: string]: string;
}

export function useTextManagement(category: string = 'operation_fees') {
  const [texts, setTexts] = useState<TextCache>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTexts();
  }, [category]);

  const fetchTexts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_text_management')
        .select('*')
        .eq('category', category);

      if (fetchError) throw fetchError;

      const textCache: TextCache = {};
      (data || []).forEach((item: TextItem) => {
        textCache[item.key] = item.value;
      });

      setTexts(textCache);
    } catch (err) {
      console.error('Error fetching texts:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل النصوص');
    } finally {
      setLoading(false);
    }
  };

  const getText = (key: string, defaultValue?: string, replacements?: Record<string, string>): string => {
    let text = texts[key] || defaultValue || key;

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        text = text.replace(`{${placeholder}}`, value);
      });
    }

    return text;
  };

  const updateText = async (key: string, newValue: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('b2f_text_management')
        .update({
          value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (updateError) throw updateError;

      setTexts(prev => ({ ...prev, [key]: newValue }));
      return true;
    } catch (err) {
      console.error('Error updating text:', err);
      return false;
    }
  };

  return {
    texts,
    loading,
    error,
    getText,
    updateText,
    refresh: fetchTexts
  };
}
