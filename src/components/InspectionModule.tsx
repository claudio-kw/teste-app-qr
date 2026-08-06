import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RotateCcw,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Layers,
  History as HistoryIcon,
} from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { parseInternalLabel, parseShippingLabel } from '../utils/qrParser';
import { findCorrelationByShippingCode } from '../utils/correlationStorage';
import { saveInspectionRecord } from '../utils/historyStorage';
import {
  playSuccessSound,
  playErrorSound,
  playScanBeep,
  triggerSuccessVibration,
  triggerErrorVibration,
} from '../utils/audioHaptics';
import {
  ParsedInternalLabel,
  ParsedShippingLabel,
  InspectionStatus,
  InspectionRecord,
} from '../types';

interface InspectionModuleProps {
  operator: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onOpenTestModal: () => void;
  onNavigateToHistory: () => void;
}

export const InspectionModule: React.FC<InspectionModuleProps> = ({
  operator,
  soundEnabled,
  hapticsEnabled,
  onOpenTestModal,
  onNavigateToHistory,
}) => {
  // Inspection workflow states: 1 = scan internal label, 2 = scan shipping label, 3 = comparison result
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Scanned label state
  const [label1Data, setLabel1Data] = useState<ParsedInternalLabel | null>(null);
  const [label2Data, setLabel2Data] = useState<ParsedShippingLabel | null>(null);

  // Comparison outcome
  const [resultStatus, setResultStatus] = useState<InspectionStatus>('OK');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [expectedInternalCode, setExpectedInternalCode] = useState<string | undefined>(undefined);
  const [savedRecord, setSavedRecord] = useState<InspectionRecord | null>(null);

  // Auto-reset / Continuous scanning timer state
  const [autoResetSeconds] = useState<number>(2.5); // 2.5 seconds auto-advance
  const [countdown, setCountdown] = useState<number>(2.5);
  const [isAutoResetPaused, setIsAutoResetPaused] = useState<boolean>(false);

  // Auto-reset countdown effect when Step 3 is reached
  React.useEffect(() => {
    if (step !== 3 || isAutoResetPaused) return;

    setCountdown(autoResetSeconds);
    const startTime = Date.now();
    const totalMs = autoResetSeconds * 1000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (totalMs - elapsed) / 1000);
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleReset();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [step, isAutoResetPaused, autoResetSeconds]);

  // Handle Scan for Label 1 (Etiqueta Interna)
  const handleScanLabel1 = (rawText: string) => {
    if (step !== 1) return;

    const parsed = parseInternalLabel(rawText);
    setLabel1Data(parsed);

    if (parsed.isValid) {
      playScanBeep(soundEnabled);
      setStep(2);
    } else {
      playErrorSound(soundEnabled);
      triggerErrorVibration(hapticsEnabled);
      alert('Formato de QR Code da Etiqueta Interna não foi reconhecido.');
    }
  };

  // Handle Scan for Label 2 (Etiqueta de Expedição) & Trigger Comparison
  const handleScanLabel2 = (rawText: string) => {
    if (step !== 2 || !label1Data) return;

    const parsedLabel2 = parseShippingLabel(rawText);
    setLabel2Data(parsedLabel2);

    if (!parsedLabel2.isValid) {
      playErrorSound(soundEnabled);
      triggerErrorVibration(hapticsEnabled);
      alert('Formato de QR Code da Etiqueta de Expedição não foi reconhecido.');
      return;
    }

    // Run Comparison Engine (<0.1s)
    runComparison(label1Data, parsedLabel2);
  };

  // Comparison Logic Engine
  const runComparison = (label1: ParsedInternalLabel, label2: ParsedShippingLabel) => {
    // Look up shipping code in Correlation Table
    const correlation = findCorrelationByShippingCode(label2.shippingCode);
    const expectedInternal = correlation?.internalCode;
    setExpectedInternalCode(expectedInternal);

    let status: InspectionStatus = 'OK';
    let message = 'Conferência Concluída: Dados Corretos!';

    if (!correlation) {
      status = 'CODIGO_NAO_MAPEADO';
      message = `Código de Expedição (${label2.shippingCode}) não possui cadastro na Tabela de Correlação!`;
    } else if (correlation.internalCode.trim().toUpperCase() !== label1.internalCode.trim().toUpperCase()) {
      status = 'DIVERGENCIA_PRODUTO';
      message = `Produto Interno (${label1.internalCode}) não corresponde ao esperado na Expedição (${label2.shippingCode}). [Esperado: ${correlation.internalCode}]`;
    } else if (label1.quantity !== label2.quantity) {
      status = 'DIVERGENCIA_QUANTIDADE';
      message = `Divergência de Quantidade: Interna=${label1.quantity} vs Expedição=${label2.quantity}`;
    }

    setResultStatus(status);
    setResultMessage(message);
    setStep(3);
    setIsAutoResetPaused(false); // Reset pause state for new result

    // Audio & Haptics Feedback
    if (status === 'OK') {
      playSuccessSound(soundEnabled);
      triggerSuccessVibration(hapticsEnabled);
    } else {
      playErrorSound(soundEnabled);
      triggerErrorVibration(hapticsEnabled);
    }

    // Save record to local history
    const record = saveInspectionRecord({
      operator,
      label1Raw: label1.raw,
      label2Raw: label2.raw,
      internalCode: label1.internalCode,
      shippingCode: label2.shippingCode,
      mappedExpectedInternalCode: expectedInternal,
      qtyInternal: label1.quantity,
      qtyShipping: label2.quantity,
      status,
      statusMessage: message,
    });

    setSavedRecord(record);
  };

  // Reset for next inspection
  const handleReset = () => {
    setStep(1);
    setLabel1Data(null);
    setLabel2Data(null);
    setResultStatus('OK');
    setResultMessage('');
    setExpectedInternalCode(undefined);
    setSavedRecord(null);
    setIsAutoResetPaused(false);
  };

  // Retry Label 2 only
  const handleRetryLabel2 = () => {
    setStep(2);
    setLabel2Data(null);
    setResultStatus('OK');
    setResultMessage('');
    setIsAutoResetPaused(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Step Indicator Header - Frosted Glass */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
          {/* Step 1 Pill */}
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
              step === 1
                ? 'bg-orange-500/90 text-white font-bold shadow-md shadow-orange-500/30 border border-orange-400/40 backdrop-blur-md'
                : label1Data
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md'
                : 'bg-white/5 text-slate-400 border border-white/5'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-xs">
              1
            </span>
            <span>Etiqueta Interna</span>
            {label1Data && step > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          {/* Step 2 Pill */}
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
              step === 2
                ? 'bg-blue-600/90 text-white font-bold shadow-md shadow-blue-500/30 border border-blue-400/40 backdrop-blur-md'
                : label2Data
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md'
                : 'bg-white/5 text-slate-400 border border-white/5'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-xs">
              2
            </span>
            <span>Etiqueta de Expedição</span>
            {label2Data && step > 2 && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-1" />}
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          {/* Step 3 Pill */}
          <div
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
              step === 3
                ? resultStatus === 'OK'
                  ? 'bg-emerald-600/90 text-white font-bold shadow-md border border-emerald-400/40 backdrop-blur-md'
                  : 'bg-red-600/90 text-white font-bold shadow-md border border-red-400/40 backdrop-blur-md'
                : 'bg-white/5 text-slate-400 border border-white/5'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-xs">
              3
            </span>
            <span>Resultado</span>
          </div>
        </div>
      </div>

      {/* Main Dynamic Workspace Area */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          {/* Scanner View for Label 1 */}
          <CameraScanner
            targetLabelType="laranja"
            isActive={true}
            onScan={handleScanLabel1}
            onSimulateExample={() => handleScanLabel1('070.001.00123|20260803|8|001')}
          />

          {/* Helper Info Card - Frosted Glass */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-300 shadow-xl">
            <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white mb-0.5">Aguardando leitura da Etiqueta Interna</p>
              <p className="text-slate-400">
                Aproxime a câmera do QR Code da etiqueta interna (ex: <code className="text-orange-300 font-mono">070.001.00123|20260803|8|001</code>).
                O código e a quantidade serão extraídos automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && label1Data && (
        <div className="space-y-6 animate-fade-in">
          {/* Label 1 Scanned Summary Card - Frosted Glass */}
          <div className="bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent backdrop-blur-xl border-2 border-orange-500/40 rounded-2xl p-4 text-slate-100 shadow-2xl space-y-2">
            <div className="flex items-center justify-between border-b border-orange-500/20 pb-2">
              <span className="bg-orange-500/90 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow">
                ✓ Leitura 1 Concluída (Etiqueta Interna)
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white underline flex items-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Cód. Item Interno:</p>
                <p className="text-sm sm:text-base font-extrabold font-mono text-orange-400">
                  {label1Data.internalCode}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-medium">Quantidade Interna:</p>
                <p className="text-sm sm:text-base font-extrabold font-mono text-white">
                  {label1Data.quantity} UN
                </p>
              </div>

              {label1Data.dateFormatted && (
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Data Embalagem:</p>
                  <p className="text-xs font-semibold text-slate-200">{label1Data.dateFormatted}</p>
                </div>
              )}

              {label1Data.lotSequence && (
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Lote / Seq:</p>
                  <p className="text-xs font-semibold text-slate-200">{label1Data.lotSequence}</p>
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-slate-400 truncate pt-1 border-t border-white/10">
              Raw: {label1Data.raw}
            </p>
          </div>

          {/* Scanner View for Label 2 */}
          <CameraScanner
            targetLabelType="branca"
            isActive={true}
            onScan={handleScanLabel2}
            onSimulateExample={() =>
              handleScanLabel2('N00008839901001,F02825000004082600006000PC,P06174I')
            }
          />

          {/* Helper Info Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-300 shadow-xl">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white mb-0.5">Aguardando leitura da Etiqueta de Expedição</p>
              <p className="text-slate-400">
                Aproxime a câmera do QR Code da etiqueta de expedição (ex: <code className="text-blue-300 font-mono">N00008839901001,F02825000004082600006000PC,P06174I</code>).
                A comparação entre produto e quantidade será realizada instantaneamente!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RESULT SCREEN (Green or Red Screen - Frosted Glass Aesthetics with Auto-Reset) */}
      {step === 3 && label1Data && label2Data && (
        <div className="space-y-6 animate-scale-up">
          {/* Auto-Reset Countdown Banner */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center space-x-2.5">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
              <div>
                <p className="font-bold text-white flex items-center space-x-1.5">
                  <span>Modo Leitura Contínua Automática</span>
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono border border-amber-500/30">
                    {countdown.toFixed(1)}s
                  </span>
                </p>
                <p className="text-slate-400 text-[11px]">
                  {isAutoResetPaused
                    ? 'Reinício automático pausado.'
                    : 'Liberando a tela para a próxima caixa sem precisar apertar botão...'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsAutoResetPaused(!isAutoResetPaused)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
              >
                {isAutoResetPaused ? 'Retomar Avanço' : 'Pausar'}
              </button>
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20"
              >
                Próxima Leitura Já
              </button>
            </div>
          </div>

          {/* Progress bar line */}
          {!isAutoResetPaused && (
            <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-white/10 -mt-3">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-100 ease-linear"
                style={{ width: `${(countdown / autoResetSeconds) * 100}%` }}
              />
            </div>
          )}

          {/* CASO 1: CONFERÊNCIA CORRETA (TUDO OK) - FROSTED GREEN SCREEN */}
          {resultStatus === 'OK' && (
            <div className="bg-emerald-950/80 backdrop-blur-2xl text-white rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.25)] border-2 border-emerald-400/60 text-center space-y-6 relative overflow-hidden">
              {/* Background Glow Ring */}
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center space-y-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/30 border-4 border-emerald-400 flex items-center justify-center shadow-lg backdrop-blur-md animate-bounce">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-300 stroke-[2.5]" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow">
                  CONFERÊNCIA CONCLUÍDA: DADOS CORRETOS
                </h2>
                <p className="text-emerald-200 font-semibold text-sm max-w-lg">
                  O produto e a quantidade correspondem perfeitamente entre a Etiqueta Interna e a Etiqueta de Expedição!
                </p>
              </div>

              {/* Comparison Details Grid */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-4 text-left space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span className="font-bold text-emerald-100">Validação de Produto (Correlação):</span>
                  </div>
                  <span className="font-mono font-black text-emerald-200 bg-emerald-800/80 px-2 py-0.5 rounded">
                    OK
                  </span>
                </div>
                <p className="text-emerald-100/90 text-xs pl-6">
                  Cód. Interno (<strong className="font-mono text-orange-300">{label1Data.internalCode}</strong>) corresponde ao Cód. Expedição (<strong className="font-mono text-blue-300">{label2Data.shippingCode}</strong>).
                </p>

                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span className="font-bold text-emerald-100">Validação de Quantidade:</span>
                  </div>
                  <span className="font-mono font-black text-emerald-200 bg-emerald-800/80 px-2 py-0.5 rounded">
                    OK
                  </span>
                </div>
                <p className="text-emerald-100/90 text-xs pl-6">
                  Quantidade Interna (<strong className="font-mono text-white">{label1Data.quantity} UN</strong>) = Quantidade Expedição (<strong className="font-mono text-white">{label2Data.quantity} UN</strong>).
                </p>
              </div>
            </div>
          )}

          {/* CASO 2: CONFERÊNCIA INCORRETA (ALERTA DE DIVERGÊNCIA) - FROSTED RED SCREEN */}
          {resultStatus !== 'OK' && (
            <div className="bg-red-950/90 backdrop-blur-2xl text-white rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] border-2 border-red-500/60 text-center space-y-6 relative overflow-hidden">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500/30 border-4 border-red-400 flex items-center justify-center shadow-lg backdrop-blur-md">
                  <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-300 stroke-[2.5]" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow">
                  ALERTA DE DIVERGÊNCIA!
                </h2>
                <p className="text-red-100 font-bold text-sm sm:text-base max-w-lg bg-red-900/50 backdrop-blur-md p-3.5 rounded-xl border border-red-400/50">
                  {resultMessage}
                </p>
              </div>

              {/* Divergence Analysis Card */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 text-left space-y-3 text-xs sm:text-sm">
                <h4 className="font-bold text-red-300 uppercase tracking-wider text-[11px] border-b border-red-500/30 pb-2">
                  Detalhamento da Falha de Conferência:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="bg-red-900/30 p-3 rounded-xl border border-red-500/30 backdrop-blur-md">
                    <p className="text-[10px] text-red-300 uppercase font-sans font-bold">Etiqueta Interna:</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">{label1Data.internalCode}</p>
                    <p className="text-red-200 text-xs">Qtd Interna = {label1Data.quantity}</p>
                  </div>

                  <div className="bg-red-900/30 p-3 rounded-xl border border-red-500/30 backdrop-blur-md">
                    <p className="text-[10px] text-red-300 uppercase font-sans font-bold">Etiqueta de Expedição:</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">{label2Data.shippingCode}</p>
                    <p className="text-red-200 text-xs">Qtd Expedição = {label2Data.quantity}</p>
                    {expectedInternalCode && (
                      <p className="text-amber-300 text-[11px] font-sans font-semibold mt-1">
                        Mapeado esperado na tabela: {expectedInternalCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleReset}
              id="btn-next-inspection"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm sm:text-base transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Próxima Leitura Já ({countdown.toFixed(1)}s)</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {resultStatus !== 'OK' && (
                <button
                  onClick={handleRetryLabel2}
                  id="btn-retry-label2"
                  className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-white/10 backdrop-blur-md"
                >
                  Refazer Leitura 2 (Expedição)
                </button>
              )}

              <button
                onClick={onNavigateToHistory}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-white/10 backdrop-blur-md flex items-center justify-center space-x-1.5"
              >
                <HistoryIcon className="w-4 h-4 text-orange-400" />
                <span>Ver Histórico</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
