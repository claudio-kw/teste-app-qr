import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Play, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';

interface TestScenario {
  id: string;
  title: string;
  description: string;
  expectedOutcome: 'DIVERGENCIA_QTD' | 'OK' | 'DIVERGENCIA_PRODUTO' | 'NAO_MAPEADO';
  laranjaRaw: string;
  brancaRaw: string;
  laranjaSummary: string;
  brancaSummary: string;
}

export const SCENARIOS: TestScenario[] = [
  {
    id: 'scen-prompt-example',
    title: 'Exemplo do Prompt (Divergência de Qtd)',
    description: 'Etiqueta Laranja Qtd 8 vs Expedição Qtd 6000PC (60). Gera Alerta de Divergência!',
    expectedOutcome: 'DIVERGENCIA_QTD',
    laranjaRaw: '070.001.00123|20260803|8|001',
    brancaRaw: 'N00008839901001,F02825000004082600006000PC,P06174I',
    laranjaSummary: 'Cód: 070.001.00123 | Qtd: 8',
    brancaSummary: 'Cód: 06174I | Qtd: 60 (6000PC)',
  },
  {
    id: 'scen-ok',
    title: 'Conferência Válida (Tudo OK)',
    description: 'Etiqueta Laranja Qtd 8 e Expedição Qtd 800PC (8.00 -> 8). Produto e Qtd correspondem.',
    expectedOutcome: 'OK',
    laranjaRaw: '070.001.00123|20260803|8|001',
    brancaRaw: 'N00008839901001,F0282500000408260000800PC,P06174I',
    laranjaSummary: 'Cód: 070.001.00123 | Qtd: 8',
    brancaSummary: 'Cód: 06174I | Qtd: 8 (800PC)',
  },
  {
    id: 'scen-product-divergence',
    title: 'Divergência de Produto',
    description: 'Laranja com item 070.001.00124 (esperado 070.001.00123 pela expedição 06174I).',
    expectedOutcome: 'DIVERGENCIA_PRODUTO',
    laranjaRaw: '070.001.00124|20260803|8|001',
    brancaRaw: 'N00008839901001,F0282500000408260000800PC,P06174I',
    laranjaSummary: 'Cód: 070.001.00124 | Qtd: 8',
    brancaSummary: 'Cód: 06174I (espera 070.001.00123) | Qtd: 8',
  },
  {
    id: 'scen-unmapped',
    title: 'Código Não Mapeado',
    description: 'Código de Expedição P99999Z não está cadastrado na Tabela de Correlação.',
    expectedOutcome: 'NAO_MAPEADO',
    laranjaRaw: '070.001.00123|20260803|8|001',
    brancaRaw: 'N00008839901001,F0282500000408260000800PC,P99999Z',
    laranjaSummary: 'Cód: 070.001.00123 | Qtd: 8',
    brancaSummary: 'Cód: 99999Z | Qtd: 8',
  },
];

interface TestLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scen: TestScenario) => void;
}

export const TestLabelsModal: React.FC<TestLabelsModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  const [selectedScen, setSelectedScen] = useState<TestScenario>(SCENARIOS[0]);
  const canvasLaranjaRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBrancaRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Render Laranja QR
    if (canvasLaranjaRef.current) {
      QRCode.toCanvas(canvasLaranjaRef.current, selectedScen.laranjaRaw, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(console.error);
    }

    // Render Branca QR
    if (canvasBrancaRef.current) {
      QRCode.toCanvas(canvasBrancaRef.current, selectedScen.brancaRaw, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(console.error);
    }
  }, [isOpen, selectedScen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900/90 border border-white/15 text-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl backdrop-blur-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Etiquetas de Teste & Réplicas Visuais</span>
            </h2>
            <p className="text-xs text-slate-400">
              Escolha um cenário para testar a conferência instantaneamente ou escaneie o QR da tela com a câmera.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Scenario Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Selecione o Cenário de Teste:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCENARIOS.map((scen) => {
                const isSelected = scen.id === selectedScen.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => setSelectedScen(scen)}
                    className={`p-3 rounded-xl border text-left transition-all backdrop-blur-md ${
                      isSelected
                        ? 'bg-orange-500/20 border-orange-500/50 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm">{scen.title}</span>
                      {scen.expectedOutcome === 'OK' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Mapeado OK
                        </span>
                      )}
                      {scen.expectedOutcome === 'DIVERGENCIA_QTD' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          Erro Qtd
                        </span>
                      )}
                      {scen.expectedOutcome === 'DIVERGENCIA_PRODUTO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Erro Prod
                        </span>
                      )}
                      {scen.expectedOutcome === 'NAO_MAPEADO' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Não Mapeado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{scen.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Replicas of Labels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Replica 1: Etiqueta Interna (Laranja) */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-orange-500/80 rounded-2xl p-4 text-slate-900 shadow-xl flex flex-col justify-between">
              <div className="border-b-2 border-orange-400/60 pb-2 mb-3 flex items-center justify-between">
                <div>
                  <span className="bg-orange-600 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow">
                    ETIQUETA INTERNA
                  </span>
                  <h4 className="font-extrabold text-sm text-orange-950 mt-1">LOGÍSTICA INTERNA</h4>
                </div>
                <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm" />
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-white p-1 rounded-xl border border-orange-300 shadow-md shrink-0">
                  <canvas ref={canvasLaranjaRef} className="block" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800">
                    Cód. Item: <span className="font-mono text-orange-700 font-extrabold">{selectedScen.laranjaSummary.split('|')[0]}</span>
                  </p>
                  <p className="font-bold text-slate-800">
                    {selectedScen.laranjaSummary.split('|')[1]}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono break-all bg-amber-100/90 p-1.5 rounded-lg border border-amber-300">
                    {selectedScen.laranjaRaw}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-orange-900 font-semibold bg-orange-200/60 p-2 rounded-lg text-center">
                Regra A: extrai primeiros 13 chars e valor antes do penúltimo pipe '|'.
              </div>
            </div>

            {/* Replica 2: Etiqueta de Expedição (Branca) */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-200 border-2 border-slate-300/80 rounded-2xl p-4 text-slate-900 shadow-xl flex flex-col justify-between">
              <div className="border-b-2 border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <div>
                  <span className="bg-slate-800 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider shadow">
                    ETIQUETA DE EXPEDIÇÃO
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 mt-1">DESPACHO / EMBALAGEM</h4>
                </div>
                <div className="w-4 h-4 rounded-full bg-slate-400 shadow-sm" />
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-white p-1 rounded-xl border border-slate-300 shadow-md shrink-0">
                  <canvas ref={canvasBrancaRef} className="block" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800">
                    Cód. Item: <span className="font-mono text-blue-700 font-extrabold">{selectedScen.brancaSummary.split('|')[0]}</span>
                  </p>
                  <p className="font-bold text-slate-800">
                    {selectedScen.brancaSummary.split('|')[1]}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono break-all bg-slate-200/90 p-1.5 rounded-lg border border-slate-300">
                    {selectedScen.brancaRaw}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-700 font-semibold bg-slate-200/60 p-2 rounded-lg text-center">
                Regra B: extrai código após prefixo 'P' e número antes de 'PC' (/100).
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-slate-400">
            Você pode escanear estes QR Codes com a câmera do celular ou aplicar o teste diretamente no aplicativo.
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold w-full sm:w-auto transition-all"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onSelectScenario(selectedScen);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold w-full sm:w-auto flex items-center justify-center space-x-2 transition-all shadow-lg shadow-orange-500/20"
            >
              <span>Executar Este Teste</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
