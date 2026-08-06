import React, { useState } from 'react';
import { Header } from './components/Header';
import { InspectionModule } from './components/InspectionModule';
import { CorrelationModule } from './components/CorrelationModule';
import { HistoryModule } from './components/HistoryModule';
import { TestLabelsModal, SCENARIOS } from './components/TestLabelsModal';
import { OperatorModal } from './components/OperatorModal';
import { ActiveTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inspection');

  // App Settings
  const [operator, setOperator] = useState<string>(() => {
    return localStorage.getItem('qr_checker_operator') || 'Operador Silva';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState<boolean>(false);

  const handleSelectOperator = (name: string) => {
    setOperator(name);
    localStorage.setItem('qr_checker_operator', name);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        operator={operator}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
        onOpenTestLabels={() => setIsTestModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'inspection' && (
          <InspectionModule
            operator={operator}
            soundEnabled={soundEnabled}
            hapticsEnabled={hapticsEnabled}
            onOpenTestModal={() => setIsTestModalOpen(true)}
            onNavigateToHistory={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'correlation' && <CorrelationModule />}

        {activeTab === 'history' && <HistoryModule />}
      </main>

      {/* Test Labels Replica & Preset Modal */}
      <TestLabelsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSelectScenario={(scen) => {
          setActiveTab('inspection');
          // Switch to inspection tab & apply test scenario if desired
        }}
      />

      {/* Operator Change Modal */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        currentOperator={operator}
        onSelectOperator={handleSelectOperator}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs py-4 text-center space-y-1">
        <p className="font-medium text-slate-400">
          Verificador de Etiquetas QR Code — Sistema de Conferência Logística Offline
        </p>
        <p className="text-[11px]">
          Comparação em tempo real: Etiqueta Interna vs Etiqueta de Expedição.
        </p>
      </footer>
    </div>
  );
}
