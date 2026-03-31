export const COMPANY_COLORS = {
  PO: '#3b82f6',
  TU: '#22c55e',
  RA: '#f97316',
  MO: '#a855f7',
};

export const COMPANY_NAMES = {
  PO: 'Portaceli / La Torre',
  TU: 'Turia / La Huerta',
  RA: 'Recetas de Autores',
  MO: 'Moier Events',
};

export const SUBTYPE_COLORS = {
  Reserva: '#3b82f6',
  PruebaMenu: '#06b6d4',
  Showroom: '#8b5cf6',
  Parcial: '#22c55e',
  Final: '#10b981',
  Liquidacion: '#14b8a6',
  CosteVariable: '#ef4444',
  CosteEstructural: '#f97316',
  CostePersonal: '#f59e0b',
  IVA: '#ec4899',
  Deuda: '#6b7280',
  Inversion: '#eab308',
};

export const SUBTYPE_LABELS = {
  Reserva: 'Reserva',
  PruebaMenu: 'Prueba Menú',
  Showroom: 'Showroom',
  Parcial: 'Pago Parcial (60%)',
  Final: 'Pago Final (40%)',
  Liquidacion: 'Liquidación',
  CosteVariable: 'Coste Variable',
  CosteEstructural: 'Coste Estructural',
  CostePersonal: 'Coste Personal',
  IVA: 'Liquidación IVA',
  Deuda: 'Amort. Deuda',
  Inversion: 'Inversión',
};

export const EVENT_TYPE_COLORS = {
  Boda: '#e11d48',
  Evento: '#3b82f6',
  Comunion: '#8b5cf6',
  Bautizo: '#06b6d4',
  Alquiler: '#f59e0b',
};

export function rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
