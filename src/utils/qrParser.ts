import { ParsedInternalLabel, ParsedShippingLabel } from '../types';

/**
 * Regra A: Leitura da Etiqueta Interna (Laranja)
 * Formato bruto exemplo: 070.001.00123|20260803|8|001
 * 
 * - Código do Item Interno: Primeiros 13 caracteres (070.001.00123)
 * - Quantidade Interna: Valor antes do penúltimo pipe '|'
 */
export function parseInternalLabel(raw: string): ParsedInternalLabel {
  const cleanRaw = raw.trim();

  if (!cleanRaw) {
    return {
      raw,
      internalCode: '',
      quantity: 0,
      isValid: false,
      error: 'Etiqueta em branco ou inválida.',
    };
  }

  // Extract internal code: first 13 characters
  let internalCode = '';
  if (cleanRaw.length >= 13) {
    internalCode = cleanRaw.substring(0, 13);
  } else {
    // Fallback if shorter than 13, split by pipe
    const parts = cleanRaw.split('|');
    internalCode = parts[0] || '';
  }

  // Split by pipe for quantity & details
  const parts = cleanRaw.split('|');
  let quantity = 0;
  let dateFormatted: string | undefined;
  let lotSequence: string | undefined;

  if (parts.length >= 3) {
    // Quantidade é o elemento no penúltimo pipe
    const qtyStr = parts[parts.length - 2].trim();
    quantity = parseInt(qtyStr, 10) || 0;

    // Data (se existir no 2º campo YYYYMMDD)
    const rawDate = parts[1]?.trim();
    if (rawDate && rawDate.length === 8 && /^\d+$/.test(rawDate)) {
      const year = rawDate.substring(0, 4);
      const month = rawDate.substring(4, 6);
      const day = rawDate.substring(6, 8);
      dateFormatted = `${day}/${month}/${year}`;
    }

    // Lote (último campo)
    lotSequence = parts[parts.length - 1]?.trim();
  } else if (parts.length === 2) {
    quantity = parseInt(parts[1].trim(), 10) || 0;
  } else {
    // Try regex for any trailing number
    const numMatch = cleanRaw.match(/\|(\d+)(?:\||$)/);
    if (numMatch) {
      quantity = parseInt(numMatch[1], 10) || 0;
    }
  }

  const isValid = Boolean(internalCode) && !isNaN(quantity);

  return {
    raw: cleanRaw,
    internalCode,
    quantity,
    dateFormatted,
    lotSequence,
    isValid,
    error: isValid ? undefined : 'Formato de Etiqueta Interna não reconhecido.',
  };
}

/**
 * Regra B: Leitura da Etiqueta de Expedição (Branca)
 * Formato bruto exemplo: N00008839901001,F02825000004082600006000PC,P06174I
 * 
 * - Código do Item de Expedição: Localizar o prefixo P. Extrair todos os caracteres após o prefixo P (ex: 06174I)
 * - Quantidade de Expedição: Localizar a sequência de dígitos que precede a indicação PC (ex: 02825000004082600006000PC).
 *   Coletar apenas os últimos 4 dígitos informados (ex: 6000). Os últimos 2 dígitos são casas decimais (ex: 6000 -> 60,00 -> 60).
 */
export function parseShippingLabel(raw: string): ParsedShippingLabel {
  const cleanRaw = raw.trim();

  if (!cleanRaw) {
    return {
      raw,
      shippingCode: '',
      quantity: 0,
      isValid: false,
      error: 'Etiqueta em branco ou inválida.',
    };
  }

  // 1. Extração do Código de Expedição (Prefix P)
  // Pode estar no formato: P06174I ou ,P06174I ou P06174I,
  let shippingCode = '';
  const pMatch = cleanRaw.match(/(?:^|,|\s)P([^,\s]+)/i);

  if (pMatch && pMatch[1]) {
    shippingCode = pMatch[1].trim();
  } else {
    // Fallback search for P followed by alphanumeric
    const altPMatch = cleanRaw.match(/P([A-Z0-9]+)/i);
    if (altPMatch) {
      shippingCode = altPMatch[1].trim();
    }
  }

  // 2. Extração da Quantidade de Expedição (Sufixo PC)
  let quantityRaw = '';
  let quantityDecimal = 0;
  let quantity = 0;

  // Localiza os dígitos imediatamente antes de PC
  const pcMatch = cleanRaw.match(/([0-9]+)\s*PC/i);

  if (pcMatch && pcMatch[1]) {
    const fullDigits = pcMatch[1];
    // Coleta apenas os últimos 4 dígitos (ex: "6000" de "02825000004082600006000")
    const padded = fullDigits.padStart(4, '0');
    const last4Digits = padded.slice(-4);
    
    quantityRaw = `${last4Digits}PC`;
    const numVal = parseInt(last4Digits, 10) || 0;

    // Os últimos 2 dígitos são casas decimais (após o ponto). Ex: 6000 = 60.00
    quantityDecimal = numVal / 100;
    
    // Se for inteiro (ex: 60.00 -> 60), usa o número inteiro para a comparação
    if (quantityDecimal % 1 === 0) {
      quantity = Math.round(quantityDecimal);
    } else {
      quantity = Number(quantityDecimal.toFixed(2));
    }
  } else {
    // Fallback: Tentar achar sequência de dígitos se isolados
    const numMatch = cleanRaw.match(/,([0-9]+)(?:PC|,|$)/i);
    if (numMatch && numMatch[1]) {
      const fullDigits = numMatch[1];
      const padded = fullDigits.padStart(4, '0');
      const last4Digits = padded.slice(-4);
      quantityRaw = `${last4Digits}PC`;
      const numVal = parseInt(last4Digits, 10) || 0;
      quantityDecimal = numVal / 100;
      quantity = quantityDecimal % 1 === 0 ? Math.round(quantityDecimal) : Number(quantityDecimal.toFixed(2));
    }
  }

  const isValid = Boolean(shippingCode) && !isNaN(quantity);

  return {
    raw: cleanRaw,
    shippingCode,
    quantityRaw,
    quantityDecimal,
    quantity,
    isValid,
    error: isValid ? undefined : 'Formato de Etiqueta de Expedição não reconhecido.',
  };
}
