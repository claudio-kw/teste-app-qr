import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Search,
  Eye,
  X,
  Filter,
} from 'lucide-react';
import { InspectionRecord } from '../types';
import {
  getHistory,
  clearHistory,
  exportHistoryAsCSV,
} from '../utils/historyStorage';

export const HistoryModule: React.FC = () => {
  const [historyRecords, setHistoryRecords] = useState<InspectionRecord[]>(() => getHistory());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'DIVERGENCIA'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  const refreshHistory = () => {
    setHistoryRecords(getHistory());
  };

  const handleClear = () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico de conferências?')) {
      clearHistory();
      refreshHistory();
    }
  };

  const handleDownloadCSV = () => {
    const csvData = exportHistoryAsCSV();
    if (!csvData) {
      alert('Nenhum registro para exportar.');
      return;
    }
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historico_conferencias_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = historyRecords.filter((rec) => {
    // Status Filter
    if (statusFilter === 'OK' && rec.status !== 'OK') return false;
    if (statusFilter === 'DIVERGENCIA' && rec.status === 'OK') return false;

    // Search term
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      rec.internalCode.toLowerCase().includes(q) ||
      rec.shippingCode.toLowerCase().includes(q) ||
      rec.operator.toLowerCase().includes(q) ||
      rec.statusMessage.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner - Frosted Glass */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Histórico de Conferências</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md">
              {historyRecords.length} Registros Auditáveis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registro detalhado de leituras de QR Code, operador responsável e divergências detectadas para auditoria.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCSV}
            disabled={historyRecords.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-200 border border-white/10 backdrop-blur-md text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleClear}
            disabled={historyRecords.length === 0}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 disabled:opacity-40 text-slate-400 hover:text-red-300 border border-white/10 backdrop-blur-md text-xs font-semibold transition-all shadow-sm"
            title="Limpar Histórico"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      {/* Filters & Table - Frosted Glass */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no histórico..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-200 text-xs sm:text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-inner"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto bg-slate-950/80 p-1 rounded-xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({historyRecords.length})
            </button>
            <button
              onClick={() => setStatusFilter('OK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'OK'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              OK ({historyRecords.filter((r) => r.status === 'OK').length})
            </button>
            <button
              onClick={() => setStatusFilter('DIVERGENCIA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'DIVERGENCIA'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow'
                  : 'text-slate-400 hover:text-red-400'
              }`}
            >
              Divergências ({historyRecords.filter((r) => r.status !== 'OK').length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-white/10 backdrop-blur-md">
              <tr>
                <th className="py-3.5 px-4">Data/Hora</th>
                <th className="py-3.5 px-4">Operador</th>
                <th className="py-3.5 px-4">Resultado</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Item Interno / Qtd</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Item Expedição / Qtd</th>
                <th className="py-3.5 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/40 backdrop-blur-md">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    Nenhum registro de conferência encontrado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isOk = rec.status === 'OK';
                  return (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                        {new Date(rec.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">{rec.operator}</td>
                      <td className="py-3.5 px-4">
                        {isOk ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>OK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 backdrop-blur-md">
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>DIVERGÊNCIA</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs hidden md:table-cell">
                        <span className="text-orange-400 font-extrabold">{rec.internalCode}</span>
                        <span className="text-slate-400"> (Qtd: {rec.qtyInternal})</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs hidden md:table-cell">
                        <span className="text-blue-400 font-extrabold">{rec.shippingCode}</span>
                        <span className="text-slate-400"> (Qtd: {rec.qtyShipping})</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal - Frosted Glass */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Conferência #{selectedRecord.id}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedRecord.timestamp).toLocaleString('pt-BR')} • Operador: {selectedRecord.operator}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border font-bold text-sm flex items-center space-x-2 backdrop-blur-md ${
                selectedRecord.status === 'OK'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              {selectedRecord.status === 'OK' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{selectedRecord.statusMessage}</span>
            </div>

            {/* Comparision Data Grid */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px]">
                  Etiqueta Interna
                </span>
                <p className="text-slate-200">
                  <strong>Código Extraído:</strong>{' '}
                  <span className="font-mono text-orange-300 font-bold">{selectedRecord.internalCode}</span>
                </p>
                <p className="text-slate-200">
                  <strong>Quantidade Interna:</strong>{' '}
                  <span className="font-mono font-bold">{selectedRecord.qtyInternal}</span>
                </p>
                <p className="text-slate-400 font-mono text-[11px] break-all bg-black/40 p-1.5 rounded border border-white/5">
                  Raw: {selectedRecord.label1Raw}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">
                  Etiqueta de Expedição
                </span>
                <p className="text-slate-200">
                  <strong>Código Extraído:</strong>{' '}
                  <span className="font-mono text-blue-300 font-bold">{selectedRecord.shippingCode}</span>
                </p>
                <p className="text-slate-200">
                  <strong>Código Interno Esperado (Tabela Verdade):</strong>{' '}
                  <span className="font-mono text-amber-300 font-bold">
                    {selectedRecord.mappedExpectedInternalCode || 'NÃO CADASTRADO'}
                  </span>
                </p>
                <p className="text-slate-200">
                  <strong>Quantidade Convertida:</strong>{' '}
                  <span className="font-mono font-bold">{selectedRecord.qtyShipping}</span>
                </p>
                <p className="text-slate-400 font-mono text-[11px] break-all bg-black/40 p-1.5 rounded border border-white/5">
                  Raw: {selectedRecord.label2Raw}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
