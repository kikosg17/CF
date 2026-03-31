const currFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const currFmt2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCurrency(v) { return currFmt2.format(v || 0); }
export function formatCurrencyShort(v) { return currFmt.format(v || 0); }

export function formatCurrencyCompact(v) {
  const abs = Math.abs(v || 0);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(0) + 'k';
  return sign + abs.toFixed(0);
}

export function signedCurrency(v) {
  const s = formatCurrencyShort(v);
  return v > 0 ? '+' + s : s;
}

export function formatDate(d) {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(d) {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatMonthYear(d) {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export function formatPercent(v, decimals = 1) {
  return (v || 0).toFixed(decimals) + '%';
}

export function formatNumber(v) {
  return new Intl.NumberFormat('es-ES').format(v || 0);
}
