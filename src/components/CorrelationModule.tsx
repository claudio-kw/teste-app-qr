import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { CorrelationItem } from '../types';
import {
  getCorrelations,
  addCorrelation,
  updateCorrelation,
  deleteCorrelation,
  resetCorrelationsToDefault,
  saveCorrelations,
} from '../utils/correlationStorage';

export const CorrelationModule: React.FC = () => {
  const [correlations, setCorrelations] = useState<CorrelationItem[]>(() => getCorrelations());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CorrelationItem | null>(null);
  const [internalCodeInput, setInternalCodeInput] = useState('');
  const [shippingCodeInput, setShippingCodeInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Notification message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Reload correlations
  const refreshList = () => {
    setCorrelations(getCorrelations());
  };

  // Lock / Unlock admin section
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === 'admin') {
      setIsAdminUnlocked(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setInternalCodeInput('');
    setShippingCodeInput('');
    setDescriptionInput('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: CorrelationItem) => {
    setEditingItem(item);
    setInternalCodeInput(item.internalCode);
    setShippingCodeInput(item.shippingCode);
    setDescriptionInput(item.description || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInternal = internalCodeInput.trim();
    const cleanShipping = shippingCodeInput.trim();

    if (!cleanInternal) {
      setFormError('Informe o Código de Item Interno.');
      return;
    }
    if (!cleanShipping) {
      setFormError('Informe o Código de Item de Expedição.');
      return;
    }

    if (editingItem) {
      updateCorrelation(editingItem.id, cleanInternal, cleanShipping, descriptionInput);
      showFeedback('success', 'Mapeamento de correlação atualizado com sucesso!');
    } else {
      addCorrelation(cleanInternal, cleanShipping, descriptionInput);
      showFeedback('success', 'Novo mapeamento cadastrado com sucesso!');
    }

    setIsFormOpen(false);
    refreshList();
  };

  // Delete Item
  const handleDelete = (item: CorrelationItem) => {
    if (
      confirm(
        `Tem certeza que deseja excluir a correlação: Interno (${item.internalCode}) <-> Expedição (${item.shippingCode})?`
      )
    ) {
      deleteCorrelation(item.id);
      showFeedback('success', 'Correlação removida com sucesso.');
      refreshList();
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (confirm('Restaurar a tabela de correlações para os valores originais do exemplo?')) {
      resetCorrelationsToDefault();
      refreshList();
      showFeedback('success', 'Correlações restauradas para o padrão!');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Codigo_Interno', 'Codigo_Expedicao', 'Descricao', 'Data_Atualizacao'];
    const rows = correlations.map((c) => [
      c.internalCode,
      c.shippingCode,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      new Date(c.updatedAt).toLocaleDateString('pt-BR'),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `correlacao_codigos_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          showFeedback('error', 'Arquivo CSV inválido ou sem dados.');
          return;
        }

        const newItems: CorrelationItem[] = [];
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/;|,/);
          if (cols.length >= 2) {
            const internalCode = cols[0].replace(/"/g, '').trim();
            const shippingCode = cols[1].replace(/"/g, '').trim();
            const description = cols[2] ? cols[2].replace(/"/g, '').trim() : '';

            if (internalCode && shippingCode) {
              newItems.push({
                id: `corr-imp-${Date.now()}-${i}`,
                internalCode,
                shippingCode,
                description,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        if (newItems.length > 0) {
          const merged = [...newItems, ...correlations];
          saveCorrelations(merged);
          refreshList();
          showFeedback('success', `${newItems.length} novas correlações importadas do CSV!`);
        } else {
          showFeedback('error', 'Nenhum registro válido encontrado no CSV.');
        }
      } catch (err) {
        showFeedback('error', 'Falha ao processar arquivo CSV.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered List
  const filteredCorrelations = correlations.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.internalCode.toLowerCase().includes(q) ||
      item.shippingCode.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Info - Frosted Glass */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Módulo de Cadastro de Correlação</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md">
              Tabela Verdade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Mapeia o <strong className="text-orange-300">Código de Item Interno (13 caracteres)</strong> com o{' '}
            <strong className="text-blue-300">Código de Item de Expedição</strong>. Esta tabela é consultada em tempo real para validar cada conferência.
          </p>
        </div>

        {/* Lock/Unlock Toggle */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {isAdminUnlocked ? (
            <button
              onClick={() => setIsAdminUnlocked(false)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md text-xs font-semibold transition-all shadow-sm"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Modo Administrador (Aberto)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAdminUnlocked(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md text-xs font-semibold transition-all shadow-sm"
            >
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Desbloquear Edição</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl font-semibold text-xs sm:text-sm flex items-center space-x-2 shadow-xl backdrop-blur-xl transition-all animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Actions & Search Bar - Frosted Glass */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código interno ou expedição..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-200 text-xs sm:text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-inner"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={handleOpenCreate}
              disabled={!isAdminUnlocked}
              id="btn-add-correlation"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-orange-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Correlação</span>
            </button>

            <button
              onClick={handleExportCSV}
              id="btn-export-csv"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md text-xs font-semibold transition-all shrink-0"
              title="Exportar Tabela CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <label
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md text-xs font-semibold cursor-pointer transition-all shrink-0"
              title="Importar Arquivo CSV"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>

            <button
              onClick={handleResetDefaults}
              disabled={!isAdminUnlocked}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 backdrop-blur-md transition-all shrink-0"
              title="Restaurar Padrões de Exemplo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table of Mappings */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-white/10 backdrop-blur-md">
              <tr>
                <th className="py-3.5 px-4">Código Interno (13 Caracteres)</th>
                <th className="py-3.5 px-4">Código Expedição (Etiqueta Branca)</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Descrição / Linha</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/40 backdrop-blur-md">
              {filteredCorrelations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                    Nenhum mapeamento de correlação encontrado.
                  </td>
                </tr>
              ) : (
                filteredCorrelations.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-extrabold text-orange-400">
                      {item.internalCode}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-blue-400">
                      {item.shippingCode}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 hidden md:table-cell">
                      {item.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        disabled={!isAdminUnlocked}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={!isAdminUnlocked}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 disabled:opacity-40 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Dialog - Frosted Glass */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Editar Correlação de Código' : 'Cadastrar Nova Correlação'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold backdrop-blur-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Item Interno (13 caracteres): *
                </label>
                <input
                  type="text"
                  value={internalCodeInput}
                  onChange={(e) => setInternalCodeInput(e.target.value)}
                  placeholder="Ex: 070.001.00123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 font-mono text-sm placeholder-slate-600 focus:ring-2 focus:ring-orange-500 shadow-inner"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Exemplo: <span className="font-mono">070.001.00123</span> (Etiqueta Laranja)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Item de Expedição: *
                </label>
                <input
                  type="text"
                  value={shippingCodeInput}
                  onChange={(e) => setShippingCodeInput(e.target.value)}
                  placeholder="Ex: 06174I"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 font-mono text-sm placeholder-slate-600 focus:ring-2 focus:ring-blue-500 shadow-inner"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Exemplo: <span className="font-mono">06174I</span> (Etiqueta Branca após 'P')
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição do Produto (Opcional):
                </label>
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Ex: Caixa Master Linha A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 text-sm placeholder-slate-600 focus:ring-2 focus:ring-orange-500 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
