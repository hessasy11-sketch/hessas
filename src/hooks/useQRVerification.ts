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
}

export interface VerificationResult {
  success: boolean;
  message: string;
  reason?: string;
  requires_pin?: boolean;
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/verify-qr-access`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ qr_token: qrToken }),
      });

      const result: VerificationResult = await response.json();

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

  const resetVerification = () => {
    setVerificationResult(null);
  };

  return {
    verifyQRToken,
    verifyStaffPin,
    isVerifying,
    verificationResult,
    resetVerification,
  };
}
