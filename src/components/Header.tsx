import React from 'react';
import { QrCode, Database, History, User, Volume2, VolumeX, Smartphone, TestTube } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  operator: string;
  onOpenOperatorModal: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (val: boolean) => void;
  onOpenTestLabels: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  operator,
  onOpenOperatorModal,
  soundEnabled,
  setSoundEnabled,
  hapticsEnabled,
  setHapticsEnabled,
  onOpenTestLabels,
}) => {
  return (
    <header className="bg-slate-900/60 backdrop-blur-2xl text-white shadow-2xl border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-orange-500/30 text-slate-950 font-bold">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                  Verificador Logístico
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md">
                  QR Compare v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Conferência de Etiqueta Interna vs Etiqueta de Expedição
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Operator Badge */}
            <button
              onClick={onOpenOperatorModal}
              id="btn-operator-profile"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs sm:text-sm font-semibold border border-white/10 backdrop-blur-md transition-all shadow-sm"
              title="Alterar Operador"
            >
              <User className="w-4 h-4 text-orange-400" />
              <span className="max-w-[100px] sm:max-w-[140px] truncate">{operator}</span>
            </button>

            {/* Test Presets Modal Launcher */}
            <button
              onClick={onOpenTestLabels}
              id="btn-test-presets"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 backdrop-blur-md text-xs sm:text-sm font-bold transition-all shadow-sm"
              title="Etiquetas de Teste & Exemplos"
            >
              <TestTube className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">Etiquetas de Teste</span>
              <span className="md:hidden">Testes</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              id="btn-toggle-sound"
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
              }`}
              title={soundEnabled ? 'Som Ativado' : 'Som Desativado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Haptics Toggle */}
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              id="btn-toggle-haptics"
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                hapticsEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
              }`}
              title={hapticsEnabled ? 'Vibração Ativada' : 'Vibração Desativada'}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-white/10 pt-2 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('inspection')}
            id="tab-inspection"
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'inspection'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Conferência</span>
          </button>

          <button
            onClick={() => setActiveTab('correlation')}
            id="tab-correlation"
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'correlation'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Cadastro de Correlação</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            id="tab-history"
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Conferências</span>
          </button>
        </div>
      </div>
    </header>
  );
};
