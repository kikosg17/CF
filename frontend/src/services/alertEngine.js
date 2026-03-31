import { toDateStr, addDays, today, ivaSettlementDates, diffDays } from '../utils/dates.js';
import { formatCurrencyShort, formatDate } from '../utils/format.js';

/**
 * Generate alerts from daily aggregates and hypotheses.
 */
export function generateAlerts(dailyAggregates, hypotheses) {
  const alerts = [];
  const thresholds = hypotheses.alertThresholds || {};
  const now = today();

  // Only analyze future days
  const futureDays = dailyAggregates.filter(d => d.date >= toDateStr(now));

  // 1. NEGATIVE_BALANCE — saldo < 0
  if (thresholds.saldoNegativo !== false) {
    for (const day of futureDays) {
      if (day.saldo < 0) {
        alerts.push({
          type: 'NEGATIVE_BALANCE',
          severity: 'critical',
          icon: '🔴',
          title: `Saldo negativo: ${formatCurrencyShort(day.saldo)}`,
          description: `El ${formatDate(day.date)} el saldo proyectado cae a ${formatCurrencyShort(day.saldo)}.`,
          date: day.date,
          amount: day.saldo,
        });
        break; // Only first occurrence
      }
    }
  }

  // 2. LOW_BALANCE — saldo < threshold
  const lowThreshold = thresholds.saldoBajo || 15000;
  for (const day of futureDays) {
    if (day.saldo > 0 && day.saldo < lowThreshold) {
      alerts.push({
        type: 'LOW_BALANCE',
        severity: 'warning',
        icon: '🟠',
        title: `Saldo bajo: ${formatCurrencyShort(day.saldo)}`,
        description: `El ${formatDate(day.date)} el saldo baja a ${formatCurrencyShort(day.saldo)} (umbral: ${formatCurrencyShort(lowThreshold)}).`,
        date: day.date,
        amount: day.saldo,
      });
      break;
    }
  }

  // 3. PAYMENT_CONCENTRATION — daily cost > threshold
  const concThreshold = thresholds.concentracionPagos || 50000;
  for (const day of futureDays) {
    if (day.cost > concThreshold) {
      alerts.push({
        type: 'PAYMENT_CONCENTRATION',
        severity: 'warning',
        icon: '⚠️',
        title: `Alta concentración de pagos: ${formatCurrencyShort(day.cost)}`,
        description: `El ${formatDate(day.date)} hay pagos por ${formatCurrencyShort(day.cost)}. Considera repartir.`,
        date: day.date,
        amount: day.cost,
      });
    }
  }

  // 4. REVENUE_GAP — N days without income
  const gapDays = thresholds.gapIngresos || 14;
  let consecutiveNoIncome = 0;
  for (const day of futureDays) {
    if (day.income === 0) {
      consecutiveNoIncome++;
      if (consecutiveNoIncome >= gapDays) {
        alerts.push({
          type: 'REVENUE_GAP',
          severity: 'recommendation',
          icon: '📉',
          title: `Gap de ingresos: ${consecutiveNoIncome} días sin cobros`,
          description: `Desde el ${formatDate(day.date)} llevas ${consecutiveNoIncome} días sin ingresos proyectados.`,
          date: day.date,
        });
        break;
      }
    } else {
      consecutiveNoIncome = 0;
    }
  }

  // 5. IVA_DUE — upcoming IVA settlement
  const ivaAnticipation = thresholds.ivaAnticipacion || 30;
  const year = now.getFullYear();
  for (const ivaDate of [...ivaSettlementDates(year), ...ivaSettlementDates(year + 1)]) {
    const daysUntil = diffDays(now, ivaDate);
    if (daysUntil > 0 && daysUntil <= ivaAnticipation) {
      const ivaEntry = futureDays.find(d => d.entries.some(e => e.subtype === 'IVA' && e.date === toDateStr(ivaDate)));
      const ivaAmount = ivaEntry
        ? ivaEntry.entries.filter(e => e.subtype === 'IVA').reduce((s, e) => s + Math.abs(e.amount), 0)
        : 0;
      alerts.push({
        type: 'IVA_DUE',
        severity: 'info',
        icon: '🏛️',
        title: `Liquidación IVA en ${daysUntil} días`,
        description: `El ${formatDate(ivaDate)} vence la liquidación trimestral de IVA${ivaAmount ? ` (~${formatCurrencyShort(ivaAmount)})` : ''}.`,
        date: toDateStr(ivaDate),
        amount: ivaAmount,
      });
    }
  }

  // 6. ADVANCE_OPPORTUNITY — days with very high balance
  const highBalance = futureDays.filter(d => d.saldo > lowThreshold * 5);
  if (highBalance.length > 5) {
    alerts.push({
      type: 'ADVANCE_OPPORTUNITY',
      severity: 'recommendation',
      icon: '💡',
      title: 'Oportunidad: excedente de tesorería',
      description: `Hay ${highBalance.length} días con saldo alto. Considera adelantar pagos a proveedores para negociar descuentos.`,
      date: highBalance[0].date,
    });
  }

  // 7. DELAY_COST_OPPORTUNITY — high costs near low balance
  for (const day of futureDays) {
    if (day.saldo < lowThreshold * 2 && day.cost > 20000) {
      const laterDay = futureDays.find(d => d.date > day.date && d.saldo > lowThreshold * 3);
      if (laterDay) {
        alerts.push({
          type: 'DELAY_COST_OPPORTUNITY',
          severity: 'recommendation',
          icon: '🔄',
          title: 'Oportunidad: retrasar pagos',
          description: `El ${formatDate(day.date)} hay pagos de ${formatCurrencyShort(day.cost)} con saldo ajustado. El saldo mejora el ${formatDate(laterDay.date)}.`,
          date: day.date,
        });
        break;
      }
    }
  }

  return alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1, recommendation: 2, info: 3 };
    return (sev[a.severity] || 9) - (sev[b.severity] || 9);
  });
}
