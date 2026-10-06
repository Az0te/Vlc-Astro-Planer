import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  Camera,
  Upload,
  ClipboardPaste,
  Download,
  Copy,
  Check,
  RefreshCw,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  ArrowRightLeft,
  Sparkles,
  MapPin,
  Eye,
  SwitchCamera,
} from 'lucide-react';
import { MultiModelSettings, LocationData, WeatherProviderId } from '../types';
import {
  getSyncShareUrl,
  getSyncJsonExport,
  serializeSyncPayload,
  parseSyncPayload,
  generateQrDataUrl,
  scanQrFromImageData,
  scanQrFromFile,
  ParsedSyncResult,
} from '../services/apiSyncService';

interface ApiSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: MultiModelSettings;
  currentLocation: LocationData;
  onApplySettings: (newSettings: MultiModelSettings, newLocation?: LocationData) => void;
  initialMode?: 'export' | 'import';
}

export const ApiSyncModal: React.FC<ApiSyncModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentLocation,
  onApplySettings,
  initialMode = 'export',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialMode);
  
  // Export states
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [includeLocation, setIncludeLocation] = useState<boolean>(true);
  const [qrFormat, setQrFormat] = useState<'url' | 'raw'>('url');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // Import states
  const [importTab, setImportTab] = useState<'camera' | 'file' | 'text'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<ParsedSyncResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Camera video / canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync mode if initialMode changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setScannedResult(null);
      setImportSuccess(false);
      setManualCode('');
      setCameraError(null);
    }
  }, [isOpen, initialMode]);

  // Lock scroll on body and handle Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Stop camera helper
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanningActive(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Generate QR code when in export mode or dependencies change
  useEffect(() => {
    if (!isOpen || activeTab !== 'export') return;

    let isMounted = true;
    setQrLoading(true);

    const payloadText =
      qrFormat === 'url'
        ? getSyncShareUrl(currentSettings, currentLocation, includeLocation)
        : serializeSyncPayload(currentSettings, currentLocation, includeLocation);

    generateQrDataUrl(payloadText)
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setQrLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR:', err);
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, currentSettings, currentLocation, includeLocation, qrFormat]);

  // Camera scanner effect
  useEffect(() => {
    if (!isOpen || activeTab !== 'import' || importTab !== 'camera' || scannedResult?.valid) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const startCamera = async () => {
      stopCamera();
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setIsScanningActive(true);
          scanFrame();
        }
      } catch (err: any) {
        console.warn('Camera access issue:', err);
        if (isMounted) {
          setCameraError(
            err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
              ? 'Permiso de cámara denegado. Puedes usar la pestaña de "Subir Imagen" o "Pegar Código".'
              : 'No se pudo acceder a la cámara en este dispositivo. Puedes subir una captura del QR o pegar el código.'
          );
        }
      }
    };

    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrText = scanQrFromImageData(imageData);

          if (qrText) {
            const parsed = parseSyncPayload(qrText);
            if (parsed.valid) {
              setScannedResult(parsed);
              stopCamera();
              return;
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab, importTab, facingMode, scannedResult]);

  // Handle uploaded QR image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const qrText = await scanQrFromFile(file);
      if (qrText) {
        const parsed = parseSyncPayload(qrText);
        setScannedResult(parsed);
      } else {
        setScannedResult({
          valid: false,
          error: 'No se detectó ningún código QR en la imagen proporcionada.',
        });
      }
    } catch (err: any) {
      setScannedResult({
        valid: false,
        error: `Error al leer imagen: ${err.message || 'desconocido'}`,
      });
    }
  };

  // Handle manual code parse
  const handleParseManualCode = (textToParse = manualCode) => {
    const parsed = parseSyncPayload(textToParse);
    setScannedResult(parsed);
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualCode(text);
        handleParseManualCode(text);
      }
    } catch {
      // Clipboard read permission might fail, keep manual input
    }
  };

  // Apply imported settings
  const handleConfirmImport = () => {
    if (!scannedResult || !scannedResult.valid || !scannedResult.settings) return;

    onApplySettings(scannedResult.settings, scannedResult.location);
    setImportSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  // Copy actions
  const handleCopyLink = () => {
    const url = getSyncShareUrl(currentSettings, currentLocation, includeLocation);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    const code = serializeSyncPayload(currentSettings, currentLocation, includeLocation);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `vlc-astro-apis-qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadJsonFile = () => {
    const jsonStr = getSyncJsonExport(currentSettings, currentLocation, includeLocation);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vlc-astro-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-[#0b101d] text-slate-100 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-slate-800 bg-[#080d19] px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Sincronizar APIs & Configuración
                </h2>
                <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Desktop ⇄ App
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pasa tus claves de OpenWeather, PirateWeather y modelos sin escribirlas a mano
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Export vs Import) */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 p-1.5 gap-1.5">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('export');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'export'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>1. Mostrar QR (Exportar)</span>
            <span className="hidden md:inline text-[10px] opacity-80 font-normal">
              — Desde este dispositivo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'import'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>2. Escanear / Recibir (Importar)</span>
            <span className="hidden md:inline text-[10px] opacity-80 font-normal">
              — Hacia este dispositivo
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: EXPORT / SHOW QR */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* QR Display Card */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-700/80 bg-slate-950/70 text-center relative group">
                  {qrLoading ? (
                    <div className="h-56 w-56 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                      <span className="text-xs text-slate-400">Generando QR...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <div className="relative p-3 bg-white rounded-2xl shadow-xl shadow-cyan-950/30">
                      <img
                        src={qrDataUrl}
                        alt="Código QR de Sincronización"
                        className="h-52 w-52 sm:h-56 sm:w-56 object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 border-2 border-cyan-400/20 rounded-2xl pointer-events-none" />
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={handleDownloadQrImage}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title="Descargar imagen PNG"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Descargar QR (PNG)</span>
                    </button>
                  </div>
                </div>

                {/* Right side: Instructions & Quick Actions */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      <span>¿Cómo funciona la sincronización?</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Smartphone className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>De Desktop al Móvil:</strong> Abre la cámara de tu smartphone y
                          apunta al QR para abrir la app con todas las claves configuradas al
                          instante.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Laptop className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Del Móvil al Desktop:</strong> Muestra este QR en tu móvil y en
                          el ordenador pulsa en <em>"2. Escanear / Recibir"</em> con tu webcam o sube
                          una captura.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeLocation}
                        onChange={(e) => setIncludeLocation(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 h-4 w-4"
                      />
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                        <span>
                          Incluir spot astronómico actual (
                          <strong className="text-white">{currentLocation.name}</strong>)
                        </span>
                      </span>
                    </label>

                    {/* Format switch */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Tipo de QR:</span>
                      <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                        <button
                          type="button"
                          onClick={() => setQrFormat('url')}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            qrFormat === 'url'
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Enlace Web (Recomendado)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrFormat('raw')}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            qrFormat === 'raw'
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Código Base64
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">¡Enlace Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Copiar Enlace Web</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyCode}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">¡Código Copiado!</span>
                        </>
                      ) : (
                        <>
                          <FileCode2 className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadJsonFile}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>Descargar archivo de configuración (.json)</span>
                  </button>
                </div>
              </div>

              {/* Status summary of exported APIs */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  APIs incluidas en este código:
                </span>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {(['openmeteo', 'openweather', 'pirateweather', 'meteoblue'] as WeatherProviderId[]).map(
                    (id) => {
                      const prov = currentSettings.providers[id];
                      const hasKey = prov?.apiKey && prov.apiKey.trim().length > 0;
                      return (
                        <span
                          key={id}
                          className={`px-2 py-0.5 rounded-md border font-mono ${
                            hasKey || (id === 'openmeteo' && prov?.enabled)
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-slate-800/60 text-slate-500 border-slate-800'
                          }`}
                        >
                          {id === 'openmeteo'
                            ? `Open-Meteo ${hasKey ? '(Clave Pro)' : '(Gratis)'}`
                            : id === 'openweather'
                            ? `OpenWeather ${hasKey ? '✓' : '✗'}`
                            : id === 'pirateweather'
                            ? `PirateWeather ${hasKey ? '✓' : '✗'}`
                            : `Meteoblue ${hasKey ? '✓' : '✗'}`}
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / SCAN */}
          {activeTab === 'import' && (
            <div className="space-y-4 animate-fade-in">
              {/* Import method pills */}
              <div className="flex border border-slate-800 rounded-xl bg-slate-950 p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setImportTab('camera');
                    setScannedResult(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold transition ${
                    importTab === 'camera'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Cámara / Webcam</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImportTab('file');
                    setScannedResult(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold transition ${
                    importTab === 'file'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir Imagen / Foto QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImportTab('text');
                    setScannedResult(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold transition ${
                    importTab === 'text'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>Pegar Código / JSON</span>
                </button>
              </div>

              {/* Subtab 1: Camera Scanner */}
              {importTab === 'camera' && !scannedResult?.valid && (
                <div className="space-y-3">
                  <div className="relative aspect-video max-h-72 w-full mx-auto rounded-2xl overflow-hidden bg-black border border-slate-700/80 flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning overlay guidelines */}
                    {isScanningActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="relative h-44 w-44 sm:h-52 sm:w-52 border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                          {/* Corner markers */}
                          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-cyan-400 rounded-tl" />
                          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-cyan-400 rounded-tr" />
                          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-cyan-400 rounded-bl" />
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-cyan-400 rounded-br" />

                          {/* Animated laser line */}
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_cyan] animate-[pulse_1.5s_ease-in-out_infinite] top-1/2" />
                        </div>
                        <span className="mt-3 text-[11px] font-semibold text-white/90 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-cyan-500/30">
                          Apunta al código QR de la otra pantalla
                        </span>
                      </div>
                    )}

                    {/* Camera switch toggle button */}
                    {isScanningActive && (
                      <button
                        onClick={() =>
                          setFacingMode((prev) =>
                            prev === 'environment' ? 'user' : 'environment'
                          )
                        }
                        className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white transition"
                        title="Cambiar entre cámara trasera y delantera"
                      >
                        <SwitchCamera className="h-4 w-4" />
                      </button>
                    )}

                    {/* Camera error / fallbacks */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/90 p-5 flex flex-col items-center justify-center text-center space-y-3">
                        <AlertCircle className="h-8 w-8 text-amber-400" />
                        <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setImportTab('file')}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition"
                          >
                            Subir Captura de QR
                          </button>
                          <button
                            onClick={() => setImportTab('text')}
                            className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition"
                          >
                            Pegar Código
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subtab 2: File Upload (Image) */}
              {importTab === 'file' && !scannedResult?.valid && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/50 hover:bg-slate-900/40 group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      Haz clic para seleccionar o suelta una foto del QR
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      Admite capturas de pantalla, fotos tomadas con el móvil (.png, .jpg, .webp)
                    </span>
                  </label>
                </div>
              )}

              {/* Subtab 3: Text Paste / JSON */}
              {importTab === 'text' && !scannedResult?.valid && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">
                      Pega el código de sincronización o el JSON exportado:
                    </span>
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      <span>Pegar desde portapapeles</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={manualCode}
                    onChange={(e) => {
                      setManualCode(e.target.value);
                      handleParseManualCode(e.target.value);
                    }}
                    placeholder="Pega aquí el enlace de sincronización, la cadena en Base64 o el contenido de tu archivo .json..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              )}

              {/* Error notice if scan failed */}
              {scannedResult && !scannedResult.valid && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">No se pudo procesar la configuración:</span>
                    <p className="mt-0.5 text-rose-200/90">{scannedResult.error}</p>
                  </div>
                </div>
              )}

              {/* SUCCESS DETECTED PREVIEW CARD */}
              {scannedResult && scannedResult.valid && scannedResult.settings && (
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-4 animate-scale-up shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>¡Configuración de APIs Detectada!</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Válido
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Se han encontrado los siguientes proveedores listos para transferir a este
                    dispositivo:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['openmeteo', 'openweather', 'pirateweather', 'meteoblue'] as WeatherProviderId[]).map(
                      (id) => {
                        const prov = scannedResult.settings!.providers[id];
                        const hasKey = prov?.apiKey && prov.apiKey.trim().length > 0;
                        const maskedKey = hasKey
                          ? `•••${prov.apiKey.slice(-4)}`
                          : id === 'openmeteo'
                          ? 'Gratis'
                          : 'Sin clave';

                        return (
                          <div
                            key={id}
                            className={`p-2.5 rounded-xl border ${
                              hasKey || (id === 'openmeteo' && prov?.enabled)
                                ? 'border-emerald-500/30 bg-slate-900/90'
                                : 'border-slate-800 bg-slate-950/60 opacity-60'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 block uppercase font-bold truncate">
                              {id === 'openmeteo'
                                ? 'Open-Meteo'
                                : id === 'openweather'
                                ? 'OpenWeather'
                                : id === 'pirateweather'
                                ? 'PirateWeather'
                                : 'Meteoblue'}
                            </span>
                            <span className="text-xs font-mono font-bold text-white block mt-0.5 truncate">
                              {maskedKey}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {scannedResult.location && (
                    <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-xl">
                      <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
                      <span>
                        Incluye spot: <strong>{scannedResult.location.name}</strong> (Bortle{' '}
                        {scannedResult.location.bortleClass || 3})
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importSuccess}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                    >
                      {importSuccess ? (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>¡APIs Importadas con Éxito!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-slate-950" />
                          <span>✓ Aplicar e Importar Ahora</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setScannedResult(null);
                        setManualCode('');
                        if (importTab === 'camera') {
                          setIsScanningActive(true);
                        }
                      }}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                    >
                      Escanear otro
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 bg-[#080d19] px-5 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sincronización segura punto a punto (sin servidores intermediarios)</span>
          </div>

          <button
            onClick={handleClose}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
