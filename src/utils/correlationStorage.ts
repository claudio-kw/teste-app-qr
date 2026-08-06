import { CorrelationItem } from '../types';

const STORAGE_KEY = 'qr_checker_correlations_v1';

export const DEFAULT_CORRELATIONS: CorrelationItem[] = [
  {
    id: 'corr-1',
    internalCode: '070.001.00123',
    shippingCode: '06174I',
    description: 'Produto Principal Caixa Master - Linha Alpha',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'corr-2',
    internalCode: '070.001.00124',
    shippingCode: '06175I',
    description: 'Componente Interno Secundário',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'corr-3',
    internalCode: '070.001.00125',
    shippingCode: '06176I',
    description: 'Módulo Eletrônico Padrão B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'corr-4',
    internalCode: '080.002.00050',
    shippingCode: '08901A',
    description: 'Kit de Montagem Industrial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getCorrelations(): CorrelationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CORRELATIONS));
      return DEFAULT_CORRELATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CORRELATIONS;
  } catch {
    return DEFAULT_CORRELATIONS;
  }
}

export function saveCorrelations(items: CorrelationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar correlações no LocalStorage', e);
  }
}

export function findCorrelationByShippingCode(shippingCode: string): CorrelationItem | undefined {
  const items = getCorrelations();
  const cleanCode = shippingCode.trim().toUpperCase();
  return items.find((item) => item.shippingCode.trim().toUpperCase() === cleanCode);
}

export function findCorrelationByInternalCode(internalCode: string): CorrelationItem | undefined {
  const items = getCorrelations();
  const cleanCode = internalCode.trim().toUpperCase();
  return items.find((item) => item.internalCode.trim().toUpperCase() === cleanCode);
}

export function addCorrelation(internalCode: string, shippingCode: string, description?: string): CorrelationItem {
  const items = getCorrelations();
  const now = new Date().toISOString();
  const newItem: CorrelationItem = {
    id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    internalCode: internalCode.trim(),
    shippingCode: shippingCode.trim(),
    description: description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newItem, ...items];
  saveCorrelations(updated);
  return newItem;
}

export function updateCorrelation(id: string, internalCode: string, shippingCode: string, description?: string): boolean {
  const items = getCorrelations();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return false;

  items[idx] = {
    ...items[idx],
    internalCode: internalCode.trim(),
    shippingCode: shippingCode.trim(),
    description: description?.trim() || '',
    updatedAt: new Date().toISOString(),
  };

  saveCorrelations(items);
  return true;
}

export function deleteCorrelation(id: string): boolean {
  const items = getCorrelations();
  const filtered = items.filter((item) => item.id !== id);
  saveCorrelations(filtered);
  return filtered.length < items.length;
}

export function resetCorrelationsToDefault(): CorrelationItem[] {
  saveCorrelations(DEFAULT_CORRELATIONS);
  return DEFAULT_CORRELATIONS;
}
