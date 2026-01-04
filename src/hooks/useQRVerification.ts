import { useState } from 'react';

export interface StaffInfo {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  role: string;
  role_title: string;
  department: string;
  permissions: Record<string, any>;
  scope_farms: string[];
  landing_route?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  reason?: string;
  requires_pin?: boolean;
  default_route?: string;
  landing_route?: string;
  staff?: StaffInfo;
}

export interface PinVerificationResult {
  success: boolean;
  message: string;
  reason?: string;
  attempts_remaining?: number;
  locked_until?: string;
}

export function useQRVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const verifyQRToken = async (qrToken: string): Promise<VerificationResult> => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      console.log('═══════════════════════════════════════════');
      console.log('🔍 STARTING QR VERIFICATION');
      console.log('QR Token:', qrToken);
      console.log('═══════════════════════════════════════════');

      // استدعاء الدالة مباشرة من Supabase
      const { supabase } = await import('../lib/supabase');

      const { data: rawResult, error } = await supabase.rpc('verify_qr_access', {
        p_qr_token: qrToken,
      });

      console.log('📞 RPC Call Result:');
      console.log('  Error:', error);
      console.log('  Data:', rawResult);

      if (error) {
        console.error('❌ RPC Error:', error);
        throw new Error(error.message);
      }

      if (!rawResult) {
        console.error('❌ No result returned');
        throw new Error('No result from verification');
      }

      console.log('═══════════════════════════════════════════');
      console.log('🔍 RAW RESULT FROM EDGE FUNCTION:');
      console.log('═══════════════════════════════════════════');
      console.log(JSON.stringify(rawResult, null, 2));

      const result: VerificationResult = {
        ...rawResult,
        default_route: rawResult.staff?.landing_route || rawResult.redirect_to || rawResult.default_route || '/hq',
        landing_route: rawResult.staff?.landing_route || rawResult.landing_route || '/hq',
        requires_pin: rawResult.requires_pin || rawResult.staff?.requires_pin || false,
        staff: rawResult.staff ? {
          id: rawResult.staff.id,
          user_id: rawResult.staff.user_id,
          full_name: rawResult.staff.display_name || rawResult.staff.full_name || 'مستخدم',
          phone: rawResult.staff.phone_number || rawResult.staff.phone || '',
          role: rawResult.staff.role || '',
          role_title: rawResult.staff.job_title || rawResult.staff.role_title || '',
          department: rawResult.staff.department || '',
          permissions: {},
          scope_farms: [],
          landing_route: rawResult.staff.landing_route || '/hq',
        } : undefined,
      };

      console.log('═══════════════════════════════════════════');
      console.log('✅ PROCESSED RESULT:');
      console.log('═══════════════════════════════════════════');
      console.log('  Success:', result.success);
      console.log('  Requires PIN:', result.requires_pin);
      console.log('  Landing Route:', result.landing_route);
      console.log('  Staff Name:', result.staff?.full_name);
      console.log('  Staff ID:', result.staff?.id);
      console.log('  Raw requires_pin:', rawResult.requires_pin);
      console.log('  Staff.requires_pin:', rawResult.staff?.requires_pin);
      console.log('═══════════════════════════════════════════');

      setVerificationResult(result);
      setIsVerifying(false);

      return result;
    } catch (error) {
      console.error('Error verifying QR token:', error);

      const errorResult: VerificationResult = {
        success: false,
        message: 'خطأ في الاتصال بالخادم',
        reason: 'network_error',
      };

      setVerificationResult(errorResult);
      setIsVerifying(false);

      return errorResult;
    }
  };

  const verifyStaffPin = async (staffId: string, pinCode: string): Promise<PinVerificationResult> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/verify-staff-pin`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ staff_id: staffId, pin_code: pinCode }),
      });

      const result: PinVerificationResult = await response.json();
      return result;
    } catch (error) {
      console.error('Error verifying PIN:', error);

      return {
        success: false,
        message: 'خطأ في الاتصال بالخادم',
        reason: 'network_error',
      };
    }
  };

  const registerDeviceAccess = async (
    staffId: string,
    deviceFingerprint: string,
    deviceType: string,
    deviceInfo: Record<string, any>,
    accessMethod: 'camera_scan' | 'image_upload',
    requiresPin: boolean,
    pinVerified: boolean
  ): Promise<any> => {
    try {
      const { supabase } = await import('../lib/supabase');

      const { data, error } = await supabase.rpc('register_device_access', {
        p_staff_id: staffId,
        p_device_fingerprint: deviceFingerprint,
        p_device_type: deviceType,
        p_device_info: deviceInfo,
        p_access_method: accessMethod,
        p_requires_pin: requiresPin,
        p_pin_verified: pinVerified,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error registering device:', error);
        return { success: false };
      }

      return data;
    } catch (error) {
      console.error('Error registering device access:', error);
      return { success: false };
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
  };

  return {
    verifyQRToken,
    verifyStaffPin,
    registerDeviceAccess,
    isVerifying,
    verificationResult,
    resetVerification,
  };
}
