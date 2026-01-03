import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Certificate {
  id: string;
  certificate_number: string;
  investor_name: string;
  investor_phone: string | null;
  farm_name: string;
  trees_count: number;
  investment_amount: number;
  duration_years: number;
  contract_start_date: string;
  contract_end_date: string | null;
  status: 'active' | 'expired' | 'suspended' | 'under_review';
  pdf_url: string | null;
  public_share_url: string | null;
  qr_code: string | null;
  issue_date: string;
  is_active: boolean;
  created_at: string;
}

export interface CertificatesStats {
  total: number;
  active: number;
  expired: number;
  underReview: number;
  suspended: number;
}

export function useMyCertificates(phoneNumber?: string) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<CertificatesStats>({
    total: 0,
    active: 0,
    expired: 0,
    underReview: 0,
    suspended: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'under_review' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!phoneNumber) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    fetchCertificates();
  }, [phoneNumber]);

  const fetchCertificates = async () => {
    if (!phoneNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('b2f_certificates')
        .select('*')
        .eq('investor_phone', phoneNumber)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const certs = (data || []) as Certificate[];
      setCertificates(certs);

      const statsData: CertificatesStats = {
        total: certs.length,
        active: certs.filter(c => c.status === 'active').length,
        expired: certs.filter(c => c.status === 'expired').length,
        underReview: certs.filter(c => c.status === 'under_review').length,
        suspended: certs.filter(c => c.status === 'suspended').length
      };
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل الشهادات');
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filter !== 'all' && cert.status !== filter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cert.certificate_number.toLowerCase().includes(query) ||
        cert.farm_name.toLowerCase().includes(query) ||
        cert.investor_name.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getCertificateById = async (certificateId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('b2f_certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      console.error('Error fetching certificate details:', err);
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusText = (status: Certificate['status']): string => {
    const statusMap = {
      active: 'سارية',
      expired: 'منتهية',
      suspended: 'معلقة',
      under_review: 'تحت المراجعة'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: Certificate['status']): string => {
    const colorMap = {
      active: 'bg-green-500',
      expired: 'bg-gray-500',
      suspended: 'bg-red-500',
      under_review: 'bg-yellow-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const downloadPDF = async (certificate: Certificate) => {
    if (!certificate.pdf_url) {
      alert('ملف PDF غير متوفر');
      return;
    }

    try {
      window.open(certificate.pdf_url, '_blank');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('حدث خطأ في تحميل الشهادة');
    }
  };

  const copyShareLink = async (certificate: Certificate) => {
    if (!certificate.public_share_url) {
      alert('رابط المشاركة غير متوفر');
      return;
    }

    try {
      await navigator.clipboard.writeText(certificate.public_share_url);
      alert('تم نسخ الرابط بنجاح');
    } catch (err) {
      console.error('Error copying link:', err);
      alert('حدث خطأ في نسخ الرابط');
    }
  };

  return {
    certificates: filteredCertificates,
    allCertificates: certificates,
    stats,
    loading,
    error,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    refresh: fetchCertificates,
    getCertificateById,
    formatDate,
    getStatusText,
    getStatusColor,
    downloadPDF,
    copyShareLink
  };
}
