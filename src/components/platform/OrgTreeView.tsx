import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, ChevronDown, ChevronRight, Plus, Power, PowerOff, UserPlus, MapPin, Briefcase } from 'lucide-react';

interface TreeNode {
  id: string;
  user_id: string;
  display_name: string;
  phone_number?: string;
  role: string;
  department: string;
  job_title?: string;
  scope_farms?: string[];
  is_active: boolean;
  children: TreeNode[];
}

interface OrgTreeViewProps {
  onAddEmployeeUnder: (managerId: string) => void;
  onToggleStatus: (staffId: string, currentStatus: boolean) => void;
  onReassignStaff: (staffId: string) => void;
}

export default function OrgTreeView({ onAddEmployeeUnder, onToggleStatus, onReassignStaff }: OrgTreeViewProps) {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrgTree();
  }, []);

  const loadOrgTree = async () => {
    setLoading(true);
    try {
      const { data: staff, error } = await supabase
        .from('platform_staff')
        .select(`
          id,
          user_id,
          role,
          department,
          job_title,
          scope_farms,
          is_active,
          manager_user_id,
          profiles:user_id (
            display_name,
            phone_number
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (staff) {
        const nodes = staff.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          display_name: s.profiles?.display_name || 'غير محدد',
          phone_number: s.profiles?.phone_number,
          role: s.role,
          department: s.department,
          job_title: s.job_title,
          scope_farms: s.scope_farms,
          is_active: s.is_active,
          manager_user_id: s.manager_user_id,
          children: []
        }));

        const tree = buildTree(nodes);
        setTreeData(tree);

        const rootIds = tree.map(n => n.id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (error) {
      console.error('Error loading org tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (nodes: any[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    nodes.forEach((node: any) => {
      nodeMap.set(node.user_id, { ...node, children: [] });
    });

    const roots: TreeNode[] = [];
    nodes.forEach((node: any) => {
      const currentNode = nodeMap.get(node.user_id);
      if (!currentNode) return;

      if (!node.manager_user_id) {
        roots.push(currentNode);
      } else {
        const parentNode = nodeMap.get(node.manager_user_id);
        if (parentNode) {
          parentNode.children.push(currentNode);
        } else {
          roots.push(currentNode);
        }
      }
    });

    return roots;
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      manager: 'مدير',
      supervisor: 'مشرف',
      agent: 'موظف',
      finance: 'مالية',
      operations: 'عمليات',
      support: 'دعم'
    };
    return labels[role] || role;
  };

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      HQ: 'from-purple-500 to-indigo-600',
      B2F: 'from-emerald-500 to-teal-600',
      B2B: 'from-blue-500 to-cyan-600',
      Support: 'from-orange-500 to-amber-600',
      Finance: 'from-rose-500 to-pink-600'
    };
    return colors[department] || 'from-gray-500 to-slate-600';
  };

  const TreeNodeComponent = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div className="relative">
        <div
          className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all mb-3 overflow-hidden ${
            !node.is_active ? 'opacity-60' : ''
          }`}
          style={{ marginRight: `${level * 40}px` }}
        >
          <div className="flex items-center gap-3 p-4">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.id)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-700" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-8" />}

            <div className={`w-12 h-12 bg-gradient-to-br ${getDepartmentColor(node.department)} rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
              {node.display_name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {node.display_name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  node.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {node.is_active ? 'نشط' : 'متوقف'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {node.job_title || getRoleLabel(node.role)}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                  {node.department}
                </span>
                {node.scope_farms && node.scope_farms.length > 0 && (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="w-3.5 h-3.5" />
                    {node.scope_farms.length} مزرعة
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onAddEmployeeUnder(node.user_id)}
                className="w-9 h-9 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center transition-all"
                title="إضافة موظف تحت هذا المدير"
              >
                <Plus className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={() => onReassignStaff(node.id)}
                className="w-9 h-9 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-all"
                title="إعادة تعيين"
              >
                <UserPlus className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => onToggleStatus(node.id, node.is_active)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  node.is_active
                    ? 'bg-red-100 hover:bg-red-200'
                    : 'bg-green-100 hover:bg-green-200'
                }`}
                title={node.is_active ? 'إيقاف' : 'تفعيل'}
              >
                {node.is_active ? (
                  <PowerOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Power className="w-4 h-4 text-green-600" />
                )}
              </button>
            </div>
          </div>

          {hasChildren && (
            <div className="px-4 pb-2">
              <div className="text-xs text-gray-500 bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                يدير {node.children.length} {node.children.length === 1 ? 'موظف' : 'موظفين'}
              </div>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-3 mt-2">
            {node.children.map((child) => (
              <TreeNodeComponent key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-semibold">جاري تحميل الهيكل التنظيمي...</p>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg font-semibold mb-2">لا يوجد هيكل تنظيمي</p>
        <p className="text-gray-400 text-sm">ابدأ بإضافة موظفين لبناء الهيكل</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-2">الهيكل التنظيمي الهرمي</h3>
        <p className="text-slate-200 text-sm">
          عرض تفاعلي للهيكل التنظيمي مع إمكانية الإدارة المباشرة
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        {treeData.map((node) => (
          <TreeNodeComponent key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
