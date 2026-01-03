import { useState, useEffect } from 'react';

export interface DeviceInfo {
  fingerprint: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  info: {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    timezone: string;
    vendor: string;
  };
}

export function useDeviceFingerprint() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    generateDeviceFingerprint();
  }, []);

  const generateDeviceFingerprint = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const vendor = navigator.vendor || 'unknown';

    const fingerprintData = [
      userAgent,
      platform,
      language,
      screenResolution,
      timezone,
      vendor
    ].join('|');

    const fingerprint = btoa(fingerprintData).substring(0, 64);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);

    let deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'unknown';
    if (isTablet) {
      deviceType = 'tablet';
    } else if (isMobile) {
      deviceType = 'mobile';
    } else {
      deviceType = 'desktop';
    }

    setDeviceInfo({
      fingerprint,
      type: deviceType,
      info: {
        userAgent,
        platform,
        language,
        screenResolution,
        timezone,
        vendor
      }
    });
  };

  return { deviceInfo };
}
