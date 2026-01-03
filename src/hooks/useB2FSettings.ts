import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface B2FSettings {
  contract_default_duration_years: number;
  contract_amount_explanation_text: string;
  contract_agreement_checkbox_text: string;
  slider_categories: string[];
  section_intro_text: string;
  min_trees_per_request: number;
  max_trees_per_request: number;
  min_investment_amount: number;
  success_request_submitted_text: string;
  success_contract_created_text: string;
  success_receipt_uploaded_text: string;
  system_name: string;
  contact_email: string;
  contact_phone: string;
}

const DEFAULT_SETTINGS: B2FSettings = {
  contract_default_duration_years: 10,
  contract_amount_explanation_text: 'المبلغ الموضح يمثل قيمة الاستثمار لمدة 10 سنوات كاملة، وليس مبلغاً سنوياً.',
  contract_agreement_checkbox_text: 'أقر أنني اطلعت على بنود العقد وفهمت أن قيمة الاستثمار تشمل كامل مدة العقد.',
  slider_categories: ['تعريف الاستثمار', 'الكل', 'نخيل', 'زيتون', 'مانجو', 'موز', 'أخرى'],
  section_intro_text: 'هنا يمكنك استئجار أشجار مثمرة لمدة استثمارية محددة، تحت إدارة المنصة.',
  min_trees_per_request: 5,
  max_trees_per_request: 1000,
  min_investment_amount: 5000,
  success_request_submitted_text: 'تم استلام طلبك الاستثماري، وسيتم التواصل معك قريباً.',
  success_contract_created_text: 'تم تفعيل عقد استثمارك، وستظهر تفاصيله في حسابك.',
  success_receipt_uploaded_text: 'تم استلام الإيصال، وسيتم مراجعته من قبل فريق المالية.',
  system_name: 'نظام استثمار أشجار المزارع',
  contact_email: 'invest@farms.sa',
  contact_phone: '0500000000',
};

export function useB2FSettings() {
  const [settings, setSettings] = useState<B2FSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_settings')
        .select('*');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const loadedSettings: Partial<B2FSettings> = { ...DEFAULT_SETTINGS };

        data.forEach((item) => {
          const key = item.setting_key as keyof B2FSettings;
          let value = item.setting_value;

          if (item.setting_type === 'number') {
            value = parseInt(value, 10);
          } else if (item.setting_type === 'json') {
            try {
              value = JSON.parse(value);
            } catch {
              value = DEFAULT_SETTINGS[key];
            }
          }

          loadedSettings[key] = value;
        });

        setSettings(loadedSettings as B2FSettings);
      }
    } catch (err) {
      console.error('Error loading B2F settings:', err);
      setError('فشل تحميل الإعدادات');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: B2FSettings) => {
    try {
      setSaving(true);
      setError(null);

      const settingsToSave = Object.entries(newSettings).map(([key, value]) => {
        let settingType = 'text';
        let settingValue = value;

        if (typeof value === 'number') {
          settingType = 'number';
          settingValue = value.toString();
        } else if (Array.isArray(value)) {
          settingType = 'json';
          settingValue = JSON.stringify(value);
        }

        return {
          setting_key: key,
          setting_value: settingValue,
          setting_type: settingType,
        };
      });

      for (const setting of settingsToSave) {
        const { error: upsertError } = await supabase
          .from('b2f_settings')
          .upsert(
            {
              setting_key: setting.setting_key,
              setting_value: setting.setting_value,
              setting_type: setting.setting_type,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'setting_key',
            }
          );

        if (upsertError) throw upsertError;
      }

      setSettings(newSettings);
      return { success: true };
    } catch (err) {
      console.error('Error saving B2F settings:', err);
      setError('فشل حفظ الإعدادات');
      return { success: false, error: 'فشل حفظ الإعدادات' };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    error,
    saveSettings,
    reloadSettings: loadSettings,
  };
}
