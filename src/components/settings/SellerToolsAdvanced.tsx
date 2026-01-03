import { useState, useEffect } from 'react';
import { Wrench, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function SellerToolsAdvanced() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const { data } = await supabase.from('seller_tools_config').select('*');
    if (data) setTools(data);
    setLoading(false);
  };

  const updateTool = async (id: string, updates: any) => {
    await supabase.from('seller_tools_config').update(updates).eq('id', id);
    loadTools();
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">أدوات البائع المتقدمة</h3>
        <p className="text-gray-600">إدارة شاملة لجميع أدوات البائعين</p>
      </div>

      {tools.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-600">لا توجد أدوات محفوظة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <div key={tool.id} className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <Wrench className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{tool.tool_name}</h4>
                      {tool.is_ai_powered && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{tool.description}</p>
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tool.is_enabled}
                    onChange={(e) => updateTool(tool.id, { is_enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-700">متاح لـ:</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={tool.available_for_free}
                    onChange={(e) => updateTool(tool.id, { available_for_free: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>مجانية</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={tool.available_for_silver}
                    onChange={(e) => updateTool(tool.id, { available_for_silver: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>فضية</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={tool.available_for_gold}
                    onChange={(e) => updateTool(tool.id, { available_for_gold: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>ذهبية</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
