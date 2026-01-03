import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OperationalPermission {
  permission_key: string;
  permission_name_ar: string;
  permission_category: string;
  can_create: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_assign: boolean;
  can_upload_proof: boolean;
  can_review_reports: boolean;
  can_send_to_management: boolean;
}

interface AccessSettings {
  requires_qr: boolean;
  requires_pin: boolean;
  allow_image_upload: boolean;
  allow_camera_scan: boolean;
  bind_first_device: boolean;
  session_duration_minutes: number;
  idle_timeout_minutes: number;
  allow_multi_device: boolean;
  qr_type: string;
}

interface ScopePermission {
  scope_type: string;
  scope_value: string | null;
  applies_to_all: boolean;
}

interface RolePermissions {
  roleKey: string | null;
  roleName: string | null;
  hierarchyLevel: number | null;
  accessSettings: AccessSettings | null;
  operationalPermissions: OperationalPermission[];
  scopePermissions: ScopePermission[];
  loading: boolean;
}

export function useRolePermissions(platformRole: string | null): RolePermissions {
  const [roleKey, setRoleKey] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [hierarchyLevel, setHierarchyLevel] = useState<number | null>(null);
  const [accessSettings, setAccessSettings] = useState<AccessSettings | null>(null);
  const [operationalPermissions, setOperationalPermissions] = useState<OperationalPermission[]>([]);
  const [scopePermissions, setScopePermissions] = useState<ScopePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!platformRole) {
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [platformRole]);

  const loadPermissions = async () => {
    if (!platformRole) return;

    try {
      const { data: roleData } = await supabase
        .from('role_definitions')
        .select('role_key, role_name_ar, hierarchy_level')
        .eq('role_key', platformRole)
        .eq('is_active', true)
        .single();

      if (!roleData) {
        console.warn('Role not found or inactive:', platformRole);
        setLoading(false);
        return;
      }

      setRoleKey(roleData.role_key);
      setRoleName(roleData.role_name_ar);
      setHierarchyLevel(roleData.hierarchy_level);

      const [accessRes, operationalRes, scopeRes] = await Promise.all([
        supabase
          .from('role_access_settings')
          .select('*')
          .eq('role_key', roleData.role_key)
          .single(),
        supabase
          .from('role_operational_permissions')
          .select('*')
          .eq('role_key', roleData.role_key),
        supabase
          .from('role_scope_permissions')
          .select('*')
          .eq('role_key', roleData.role_key)
      ]);

      setAccessSettings(accessRes.data);
      setOperationalPermissions(operationalRes.data || []);
      setScopePermissions(scopeRes.data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    roleKey,
    roleName,
    hierarchyLevel,
    accessSettings,
    operationalPermissions,
    scopePermissions,
    loading
  };
}

export function usePermissionCheck(platformRole: string | null) {
  const { operationalPermissions, loading } = useRolePermissions(platformRole);

  const hasPermission = (
    permissionKey: string,
    action: 'create' | 'view' | 'edit' | 'delete' | 'approve' | 'reject' | 'assign' | 'upload_proof' | 'review_reports' | 'send_to_management'
  ): boolean => {
    if (!platformRole) return false;

    if (platformRole === 'platform_owner') return true;

    const permission = operationalPermissions.find(p => p.permission_key === permissionKey);
    if (!permission) return false;

    const actionMap = {
      create: permission.can_create,
      view: permission.can_view,
      edit: permission.can_edit,
      delete: permission.can_delete,
      approve: permission.can_approve,
      reject: permission.can_reject,
      assign: permission.can_assign,
      upload_proof: permission.can_upload_proof,
      review_reports: permission.can_review_reports,
      send_to_management: permission.can_send_to_management
    };

    return actionMap[action] || false;
  };

  const canAccessPage = (pageKey: string): boolean => {
    if (!platformRole) return false;
    if (platformRole === 'platform_owner') return true;

    const pagePermissions: Record<string, string[]> = {
      'hq': ['platform_owner', 'super_admin', 'general_manager'],
      'farms': ['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager'],
      'operations': ['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor', 'operations_supervisor'],
      'tasks': ['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor', 'operations_supervisor', 'task_executor'],
      'reports': ['platform_owner', 'super_admin', 'general_manager', 'section_manager', 'farm_manager', 'farm_supervisor'],
      'permissions': ['platform_owner', 'super_admin'],
      'staff': ['platform_owner', 'super_admin', 'general_manager'],
      'auctions': ['platform_owner', 'super_admin', 'general_manager', 'section_manager']
    };

    return pagePermissions[pageKey]?.includes(platformRole) || false;
  };

  const getPermissionsByCategory = (category: string) => {
    return operationalPermissions.filter(p => p.permission_category === category);
  };

  return {
    hasPermission,
    canAccessPage,
    getPermissionsByCategory,
    loading
  };
}

export function useAccessControl(platformRole: string | null) {
  const { accessSettings, loading } = useRolePermissions(platformRole);

  return {
    requiresQR: accessSettings?.requires_qr || false,
    requiresPIN: accessSettings?.requires_pin || false,
    allowImageUpload: accessSettings?.allow_image_upload || false,
    allowCameraScan: accessSettings?.allow_camera_scan || false,
    bindFirstDevice: accessSettings?.bind_first_device || false,
    allowMultiDevice: accessSettings?.allow_multi_device || false,
    sessionDuration: accessSettings?.session_duration_minutes || 30,
    idleTimeout: accessSettings?.idle_timeout_minutes || 15,
    qrType: accessSettings?.qr_type || 'permanent',
    loading
  };
}
