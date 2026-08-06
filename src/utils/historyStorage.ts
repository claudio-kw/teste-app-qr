import { InspectionRecord } from '../types';

const HISTORY_STORAGE_KEY = 'qr_checker_history_v1';
const MAX_HISTORY_RECORDS = 100;

export function getHistory(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInspectionRecord(record: Omit<InspectionRecord, 'id' | 'timestamp'>): InspectionRecord {
  const history = getHistory();
  const newRecord: InspectionRecord = {
    ...record,
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  const updated = [newRecord, ...history].slice(0, MAX_HISTORY_RECORDS);
  
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erro ao salvar histórico', e);
  }

  return newRecord;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao limpar histórico', e);
  }
}

export function exportHistoryAsCSV(): string {
  const records = getHistory();
  if (records.length === 0) return '';

  const headers = [
    'ID',
    'Data/Hora',
    'Operador',
    'Status',
    'Mensagem',
    'Item Interno',
    'Item Expedição',
    'Item Interno Esperado',
    'Qtd Interna',
    'Qtd Expedição',
    'Raw Laranja',
    'Raw Branca',
  ];

  const rows = records.map((r) => [
    r.id,
    new Date(r.timestamp).toLocaleString('pt-BR'),
    `"${r.operator.replace(/"/g, '""')}"`,
    r.status,
    `"${r.statusMessage.replace(/"/g, '""')}"`,
    r.internalCode,
    r.shippingCode,
    r.mappedExpectedInternalCode || '-',
    r.qtyInternal,
    r.qtyShipping,
    `"${r.label1Raw.replace(/"/g, '""')}"`,
    `"${r.label2Raw.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
}
