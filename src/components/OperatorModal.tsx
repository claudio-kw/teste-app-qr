import React, { useState } from 'react';
import { User, Check, X, Plus } from 'lucide-react';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOperator: string;
  onSelectOperator: (name: string) => void;
}

const PRESET_OPERATORS = [
  'Operador Silva',
  'Operador Carlos',
  'Operadora Ana',
  'Supervisor Roberto',
  'Conferente Lucas',
];

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  currentOperator,
  onSelectOperator,
}) => {
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      onSelectOperator(customName.trim());
      setCustomName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl backdrop-blur-2xl space-y-5 text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold">Identificação do Operador</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Selecione quem está realizando a conferência logística. Este nome será vinculado ao histórico das leituras.
        </p>

        {/* Preset List */}
        <div className="space-y-2">
          {PRESET_OPERATORS.map((op) => {
            const isSelected = op === currentOperator;
            return (
              <button
                key={op}
                onClick={() => {
                  onSelectOperator(op);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all backdrop-blur-md ${
                  isSelected
                    ? 'bg-orange-500/20 border-orange-500/50 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{op}</span>
                {isSelected && <Check className="w-4 h-4 text-orange-400" />}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-white/10 space-y-2">
          <label className="block text-xs font-semibold text-slate-400">Ou informe outro nome:</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nome do Operador..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-orange-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
