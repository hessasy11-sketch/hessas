import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { AlertTriangle, Camera, CheckCircle, XCircle } from 'lucide-react';

interface SmartQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  scanStatus: 'ready' | 'valid' | 'needsPin' | 'rejected';
}

interface ScanAttempt {
  timestamp: number;
  brightness: number;
  contrast: number;
}

export function SmartQRScanner({ onScanSuccess, onScanError, scanStatus }: SmartQRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const scanAttemptsRef = useRef<ScanAttempt[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const frameCountRef = useRef(0);
  const brightnessHistoryRef = useRef<number[]>([]);

  const analyzeImageQuality = useCallback((imageData: ImageData): { brightness: number; contrast: number; isStatic: boolean } => {
    const data = imageData.data;
    let totalBrightness = 0;
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
    }

    const avgBrightness = totalBrightness / (data.length / 4);
    const contrast = max - min;

    brightnessHistoryRef.current.push(avgBrightness);
    if (brightnessHistoryRef.current.length > 10) {
      brightnessHistoryRef.current.shift();
    }

    const brightnessVariance = calculateVariance(brightnessHistoryRef.current);
    const isStatic = brightnessVariance < 5;

    return { brightness: avgBrightness, contrast, isStatic };
  }, []);

  const calculateVariance = (values: number[]): number => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const detectSpoofing = useCallback((brightness: number, contrast: number, isStatic: boolean): boolean => {
    if (contrast < 20) {
      return true;
    }

    if (brightness > 200 && contrast < 50) {
      return true;
    }

    if (isStatic && frameCountRef.current > 20) {
      return true;
    }

    const recentAttempts = scanAttemptsRef.current.filter(
      attempt => Date.now() - attempt.timestamp < 3000
    );

    if (recentAttempts.length > 5) {
      const avgBrightness = recentAttempts.reduce((sum, a) => sum + a.brightness, 0) / recentAttempts.length;
      const brightnessVariance = calculateVariance(recentAttempts.map(a => a.brightness));

      if (brightnessVariance < 3 && avgBrightness > 180) {
        return true;
      }
    }

    return false;
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();

    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
      return;
    }

    const imageData = captureFrame();
    if (!imageData) return;

    const { brightness, contrast, isStatic } = analyzeImageQuality(imageData);

    scanAttemptsRef.current.push({
      timestamp: now,
      brightness,
      contrast
    });

    if (scanAttemptsRef.current.length > 10) {
      scanAttemptsRef.current.shift();
    }

    const isSpoofed = detectSpoofing(brightness, contrast, isStatic);

    if (isSpoofed) {
      setSuspiciousActivity(true);
      if (onScanError) {
        onScanError('تم اكتشاف محاولة تلاعب محتملة');
      }
      setTimeout(() => setSuspiciousActivity(false), 3000);
      return;
    }

    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    frameCountRef.current = 0;
    onScanSuccess(decodedText);
  }, [onScanSuccess, onScanError, captureFrame, analyzeImageQuality, detectSpoofing]);

  const startScanning = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 30,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' }
          ]
        }
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
        }
      );

      setIsScanning(true);
      setCameraError('');

      const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElement) {
        videoRef.current = videoElement;
      }

      const frameInterval = setInterval(() => {
        if (scannerRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
          frameCountRef.current++;
          captureFrame();
        }
      }, 100);

      return () => clearInterval(frameInterval);

    } catch (err) {
      console.error('Error starting scanner:', err);
      setCameraError('فشل في الوصول إلى الكاميرا');
      if (onScanError) {
        onScanError('فشل في تشغيل الكاميرا');
      }
    }
  }, [handleScanSuccess, onScanError, captureFrame]);

  useEffect(() => {
    startScanning();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [startScanning]);

  return (
    <div className="relative">
      <div id="qr-reader" className="rounded-2xl overflow-hidden"></div>

      <canvas ref={canvasRef} className="hidden"></canvas>

      {suspiciousActivity && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-2xl backdrop-blur-sm animate-pulse">
          <div className="text-center p-6">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-3" />
            <p className="text-red-200 font-bold text-lg" dir="rtl">
              تم اكتشاف محاولة تلاعب
            </p>
            <p className="text-red-300 text-sm mt-2" dir="rtl">
              يرجى استخدام رمز QR أصلي
            </p>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-2xl">
          <div className="text-center p-6">
            <Camera className="w-16 h-16 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 font-bold text-lg" dir="rtl">
              {cameraError}
            </p>
            <button
              onClick={startScanning}
              className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              dir="rtl"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {isScanning && !suspiciousActivity && !cameraError && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium" dir="rtl">
                المسح نشط
              </span>
            </div>
            {scanStatus === 'valid' && (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            {scanStatus === 'rejected' && (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
