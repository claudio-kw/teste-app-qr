import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, SwitchCamera, Upload, Keyboard, RefreshCw, Sparkles, ShieldAlert, ExternalLink, HelpCircle } from 'lucide-react';

interface CameraScannerProps {
  onScan: (scannedText: string) => void;
  targetLabelType: 'laranja' | 'branca';
  isActive: boolean;
  onSimulateExample?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScan,
  targetLabelType,
  isActive,
  onSimulateExample,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);

  // Manual input mode toggle
  const [inputMode, setInputMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualText, setManualText] = useState<string>('');

  const scanIntervalRef = useRef<number | null>(null);

  // Fetch available camera devices
  useEffect(() => {
    async function initDevices() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        setCameras(videoDevices);

        if (videoDevices.length > 0 && !selectedCameraId) {
          // Prefer environment / back camera if available
          const backCamera = videoDevices.find(
            (dev) =>
              dev.label.toLowerCase().includes('back') ||
              dev.label.toLowerCase().includes('traseira') ||
              dev.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Erro ao listar câmeras:', err);
      }
    }

    initDevices();
  }, []);

  // Start or stop camera stream based on selectedCameraId & isActive
  const startCamera = async (overrideCameraId?: string) => {
    if (!isActive || inputMode !== 'camera') {
      stopCamera();
      return;
    }

    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de Câmera indisponível no navegador.');
      }

      const camId = overrideCameraId || selectedCameraId;
      const constraints: MediaStreamConstraints = {
        video: camId
          ? { deviceId: { exact: camId } }
          : { facingMode: { ideal: 'environment' } },
      };

      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        if (camId) {
          // Retry without exact deviceId constraint
          console.warn('Tentando câmera no modo flexível...', firstErr);
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
        } else {
          throw firstErr;
        }
      }

      setStream(newStream);
      setIsCameraActive(true);

      // Re-enumerate devices after permission granted
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
          setCameras(videoDevices);
        }
      } catch (e) {
        // ignore device listing error
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Falha ao iniciar câmera:', err);
      setIsCameraActive(false);

      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission denied') ||
        errMsg.toLowerCase().includes('permissão')
      ) {
        setCameraError('Permissão da câmera foi negada no navegador ou no ambiente iFrame.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera física detectada no dispositivo.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('A câmera está sendo utilizada por outro aplicativo ou aba.');
      } else {
        setCameraError(`Falha ao iniciar câmera: ${errMsg || errName || 'Acesso indisponível.'}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [selectedCameraId, isActive, inputMode]);

  // QR Scanning Loop using jsQR
  useEffect(() => {
    if (!isCameraActive || !isActive || inputMode !== 'camera') {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    scanIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        onScan(code.data);
      }
    }, 120);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isActive, inputMode, onScan]);

  // Handle image file upload decoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          onScan(code.data);
        } else {
          alert('Nenhum QR Code válido foi identificado na imagem enviada.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Switch camera toggle
  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].deviceId);
  };

  const isLaranja = targetLabelType === 'laranja';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mode Switcher Buttons - Frosted Glass Glassmorphism */}
      <div className="flex items-center space-x-2 mb-3 bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={() => setInputMode('camera')}
          id="btn-mode-camera"
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            inputMode === 'camera'
              ? 'bg-orange-500/90 text-white shadow-md shadow-orange-500/20 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Câmera Ao Vivo</span>
        </button>

        <button
          type="button"
          onClick={() => setInputMode('upload')}
          id="btn-mode-upload"
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            inputMode === 'upload'
              ? 'bg-orange-500/90 text-white shadow-md shadow-orange-500/20 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Enviar Imagem</span>
        </button>

        <button
          type="button"
          onClick={() => setInputMode('manual')}
          id="btn-mode-manual"
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            inputMode === 'manual'
              ? 'bg-orange-500/90 text-white shadow-md shadow-orange-500/20 backdrop-blur-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Digitar QR</span>
        </button>
      </div>

      {/* Target Type Header Badge */}
      <div
        className={`w-full text-center py-2.5 px-4 rounded-t-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border-t border-x border-white/10 backdrop-blur-xl ${
          isLaranja
            ? 'bg-orange-500/20 text-orange-300 shadow-md border-orange-500/30'
            : 'bg-blue-500/20 text-blue-300 shadow-md border-blue-500/30'
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isLaranja ? 'bg-orange-400' : 'bg-blue-400'}`} />
        <span>
          {isLaranja
            ? 'Etapa 1: Leitura da Etiqueta Interna'
            : 'Etapa 2: Leitura da Etiqueta de Expedição'}
        </span>
      </div>

      {/* Main Scanner Container - Frosted Glass Backdrop */}
      <div className="w-full relative bg-slate-900/40 backdrop-blur-xl rounded-b-2xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/3] max-h-[380px] flex items-center justify-center">
        {inputMode === 'camera' && (
          <>
            {/* Hidden Processing Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Stream */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />

            {/* Camera Reticle Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Detection Frame Box */}
                <div
                  className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 transition-all duration-300 ${
                    isLaranja
                      ? 'border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.5)]'
                      : 'border-blue-400 shadow-[0_0_35px_rgba(96,165,250,0.5)]'
                  }`}
                >
                  {/* Scanning Laser Line */}
                  <div
                    className={`absolute inset-x-2 h-0.5 rounded-full ${
                      isLaranja ? 'bg-orange-400 shadow-[0_0_15px_#f97316]' : 'bg-blue-300 shadow-[0_0_15px_#60a5fa]'
                    }`}
                    style={{
                      animation: 'scanLine 2.2s ease-in-out infinite alternate',
                    }}
                  />

                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>

                <p className="mt-4 px-3.5 py-1.5 rounded-full bg-slate-900/80 text-slate-200 text-xs font-semibold backdrop-blur-md border border-white/10 shadow-lg">
                  Posicione o QR Code dentro da moldura
                </p>
              </div>
            )}

            {/* Camera Error or Off State (Permission Denied, etc) */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-5 text-center z-20 overflow-y-auto">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-2 shadow-lg shrink-0">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-white font-extrabold text-sm sm:text-base mb-1">Acesso à Câmera Bloqueado / Indisponível</h3>
                <p className="text-amber-300 font-semibold text-xs mb-2 max-w-md">
                  {cameraError}
                </p>

                <p className="text-slate-400 text-[11px] mb-4 max-w-md">
                  O iFrame do ambiente ou a política de privacidade do navegador pode impedir a câmera direta nesta janela.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  <button
                    onClick={() => startCamera()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                    <span>Solicitar Permissão Câmera</span>
                  </button>

                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-orange-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </button>

                  <button
                    onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Como Liberar?</span>
                  </button>
                </div>

                {/* Alternative Modes */}
                <div className="flex items-center space-x-2 pt-2 border-t border-white/10 w-full justify-center max-w-xs">
                  <button
                    onClick={() => setInputMode('manual')}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-[11px] font-bold transition-all"
                  >
                    Digitar QR
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-[11px] font-bold transition-all"
                  >
                    Enviar Imagem
                  </button>
                </div>

                {/* Browser permission unlock guide */}
                {showPermissionGuide && (
                  <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-white/10 text-left text-[11px] text-slate-300 space-y-1.5 max-w-md animate-fade-in">
                    <p className="font-bold text-orange-400">Como autorizar a câmera:</p>
                    <p>• <strong>Google Chrome/Edge:</strong> Clique no ícone de cadeado/configurações na barra de endereço &rarr; Permissões &rarr; Câmera &rarr; <em>Permitir</em>.</p>
                    <p>• <strong>Safari (iOS/Mac):</strong> Toque em "aA" na barra do navegador &rarr; Configurações do Site &rarr; Câmera &rarr; <em>Permitir</em>.</p>
                    <p>• <strong>Solução Rápida:</strong> Clique no botão <em>"Abrir em Nova Aba"</em> acima para carregar o app fora do iFrame.</p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Control Overlay Top Bar */}
            {isCameraActive && cameras.length > 1 && (
              <button
                type="button"
                onClick={toggleCamera}
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur-md border border-white/10 shadow-lg"
                title="Trocar Câmera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Upload Mode UI */}
        {inputMode === 'upload' && (
          <div className="p-6 text-center flex flex-col items-center justify-center w-full h-full">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-white/20 hover:border-orange-500/80 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-900/50 backdrop-blur-md transition-all hover:bg-slate-900/80 group"
            >
              <Upload className="w-10 h-10 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-slate-100 font-bold text-sm">Clique ou arraste uma foto com QR Code</p>
              <p className="text-slate-400 text-xs mt-1">Suporta imagens JPG, PNG, WEBP</p>
            </div>
          </div>
        )}

        {/* Manual Input Mode UI */}
        {inputMode === 'manual' && (
          <div className="p-6 text-center flex flex-col items-center justify-center w-full h-full max-w-md">
            <h3 className="text-slate-100 font-bold text-sm mb-1">Digitar Conteúdo do QR Code</h3>
            <p className="text-slate-400 text-xs mb-4">
              {isLaranja
                ? 'Cole o texto da Etiqueta Laranja (Ex: 070.001.00123|20260803|8|001)'
                : 'Cole o texto da Etiqueta Branca (Ex: N00008839901001,F02825000004082600006000PC,P06174I)'}
            </p>
            <div className="w-full space-y-3">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={
                  isLaranja
                    ? '070.001.00123|20260803|8|001'
                    : 'N00008839901001,F02825000004082600006000PC,P06174I'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-orange-500 font-mono shadow-inner"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualText.trim()) {
                    onScan(manualText.trim());
                    setManualText('');
                  }
                }}
                disabled={!manualText.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
              >
                Processar Leitura
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Preset Simulation Trigger */}
      {onSimulateExample && (
        <div className="mt-3 w-full flex justify-end">
          <button
            type="button"
            onClick={onSimulateExample}
            id="btn-quick-sample-fill"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl text-orange-400 text-xs font-bold border border-white/10 transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Simular Leitura Exemplo ({isLaranja ? 'Interna' : 'Expedição'})</span>
          </button>
        </div>
      )}

      {/* CSS Keyframe Animation for Scanning Line */}
      <style>{`
        @keyframes scanLine {
          0% { top: 8px; }
          100% { top: calc(100% - 12px); }
        }
      `}</style>
    </div>
  );
};

