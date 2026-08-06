export interface CorrelationItem {
  id: string;
  internalCode: string; // e.g. "070.001.00123" (13 chars)
  shippingCode: string; // e.g. "06174I"
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedInternalLabel {
  raw: string;
  internalCode: string; // e.g. "070.001.00123"
  dateFormatted?: string; // e.g. "2026-08-03" -> "03/08/2026"
  quantity: number; // e.g. 8
  lotSequence?: string; // e.g. "001"
  isValid: boolean;
  error?: string;
}

export interface ParsedShippingLabel {
  raw: string;
  shippingCode: string; // e.g. "06174I"
  quantityRaw?: string; // e.g. "6000PC"
  quantityDecimal?: number; // e.g. 60.00
  quantity: number; // e.g. 60
  fullSpecifier?: string;
  isValid: boolean;
  error?: string;
}

export type InspectionStatus = 
  | 'OK' 
  | 'DIVERGENCIA_PRODUTO' 
  | 'DIVERGENCIA_QUANTIDADE' 
  | 'CODIGO_NAO_MAPEADO'
  | 'ERRO_FORMATO';

export interface InspectionRecord {
  id: string;
  timestamp: string;
  operator: string;
  label1Raw: string;
  label2Raw: string;
  internalCode: string;
  shippingCode: string;
  mappedExpectedInternalCode?: string;
  qtyInternal: number;
  qtyShipping: number;
  status: InspectionStatus;
  statusMessage: string;
}

export type ActiveTab = 'inspection' | 'correlation' | 'history' | 'generator';
