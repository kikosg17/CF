import { CashFlowEntry, resetIdCounter } from '../models/CashFlowEntry.js';
import { getPaymentSchedule } from '../models/Event.js';
import { toDateStr, eachDay, ivaSettlementDates, addMonths, parseDate } from '../utils/dates.js';
import { generateInvestmentFlows } from './investmentEngine.js';

/**
 * Get structural cost total per company, respecting detailed breakdown.
 */
function getStructuralCostTotal(co, hyp) {
  const det = hyp.structuralCostsDetailed;
  if (det && det[co] && det[co].useDetalle) {
    let total = 0;
    for (const cat of det[co].categories) {
      for (const item of cat.items) {
        total += Number(item.amount) || 0;
      }
    }
    return total;
  }
  return (hyp.structuralCosts && hyp.structuralCosts[co]) || 0;
}

/**
 * Run the full projection from events + hypotheses → CashFlowEntry[]
 */
export function runProjection(rawEvents, hypotheses) {
  resetIdCounter();
  const entries = [];
  const hyp = hypotheses;
  const horizonEnd = hyp.horizonEnd || '2027-12-31';

  // 1. Process each event → payment schedule
  for (const ev of rawEvents) {
    const schedule = getPaymentSchedule(ev, hyp);
    for (const p of schedule) {
      if (p.date > horizonEnd) continue;
      entries.push(new CashFlowEntry({
        date: p.date,
        amount: p.amount,
        type: p.amount >= 0 ? 'INCOME' : 'COST',
        subtype: p.subtype,
        company: p.company,
        eventId: p.eventId,
        eventNombre: p.eventNombre,
        eventTipo: p.eventTipo,
        paxEfectivos: p.paxEfectivos,
        source: 'PROJECTED',
        description: p.description,
      }));
    }
  }

  // 2. Fixed costs: structural + staff, 1st of each month, per company
  const companies = ['PO', 'TU', 'RA', 'MO'];
  const today = new Date();
  let costMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = parseDate(horizonEnd);

  while (costMonth <= endDate) {
    const dateStr = toDateStr(costMonth);
    for (const co of companies) {
      const structural = getStructuralCostTotal(co, hyp);
      if (structural > 0) {
        entries.push(new CashFlowEntry({
          date: dateStr,
          amount: -structural,
          type: 'COST',
          subtype: 'CosteEstructural',
          company: co,
          source: 'PROJECTED',
          description: `Costes estructurales ${co}`,
        }));
      }
      const staff = (hyp.staffCosts && hyp.staffCosts[co]) || 0;
      if (staff > 0) {
        entries.push(new CashFlowEntry({
          date: dateStr,
          amount: -staff,
          type: 'COST',
          subtype: 'CostePersonal',
          company: co,
          source: 'PROJECTED',
          description: `Costes personal ${co}`,
        }));
      }
    }
    costMonth = addMonths(costMonth, 1);
  }

  // 3. IVA settlements (20th of Jan, Apr, Jul, Oct)
  for (let yr = today.getFullYear(); yr <= endDate.getFullYear(); yr++) {
    for (const ivaDate of ivaSettlementDates(yr)) {
      if (ivaDate > endDate || ivaDate < today) continue;
      const dateStr = toDateStr(ivaDate);
      // Estimate IVA as ~21% of quarterly income minus deductible
      const qStart = new Date(ivaDate.getFullYear(), ivaDate.getMonth() - 3, 1);
      const qEnd = new Date(ivaDate.getFullYear(), ivaDate.getMonth(), 0);
      const qIncome = entries
        .filter(e => e.type === 'INCOME' && e.date >= toDateStr(qStart) && e.date <= toDateStr(qEnd))
        .reduce((s, e) => s + e.amount, 0);
      const qCost = entries
        .filter(e => e.type === 'COST' && e.subtype !== 'IVA' && e.date >= toDateStr(qStart) && e.date <= toDateStr(qEnd))
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      const ivaPayable = Math.round((qIncome - qCost) * 0.21 / 1.21);
      if (ivaPayable > 0) {
        entries.push(new CashFlowEntry({
          date: dateStr,
          amount: -ivaPayable,
          type: 'COST',
          subtype: 'IVA',
          company: 'GROUP',
          source: 'PROJECTED',
          description: `Liquidación IVA trimestral`,
        }));
      }
    }
  }

  // 4. Debt schedule
  if (hyp.deuda && hyp.deuda.enabled && hyp.deuda.items) {
    for (const debt of hyp.deuda.items) {
      if (!debt.cuotaMensual || !debt.inicio) continue;
      let d = parseDate(debt.inicio);
      const debtEnd = debt.fin ? parseDate(debt.fin) : endDate;
      while (d <= debtEnd && d <= endDate) {
        entries.push(new CashFlowEntry({
          date: toDateStr(d),
          amount: -Number(debt.cuotaMensual),
          type: 'COST',
          subtype: 'Deuda',
          company: debt.sociedad || 'GROUP',
          source: 'PROJECTED',
          description: `Amortización: ${debt.nombre || 'Deuda'}`,
        }));
        d = addMonths(d, 1);
      }
    }
  }

  // 5. Investment flows
  if (hyp.investments && hyp.investments.length > 0) {
    const invFlows = generateInvestmentFlows(hyp.investments, hyp, horizonEnd);
    for (const f of invFlows) {
      entries.push(new CashFlowEntry({
        date: f.date,
        amount: f.amount,
        type: f.amount >= 0 ? 'INCOME' : 'COST',
        subtype: 'Inversion',
        company: f.company || 'GROUP',
        source: 'PROJECTED',
        description: f.description,
      }));
    }
  }

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

/**
 * Aggregate entries by day with running balance.
 */
export function getDailyAggregates(entries, saldoInicial) {
  if (!entries.length) return [];
  const byDay = {};
  for (const e of entries) {
    if (!byDay[e.date]) {
      byDay[e.date] = { date: e.date, income: 0, cost: 0, entries: [] };
    }
    if (e.type === 'INCOME') byDay[e.date].income += e.amount;
    else byDay[e.date].cost += Math.abs(e.amount);
    byDay[e.date].entries.push(e);
  }

  const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  let balance = saldoInicial || 0;
  for (const day of days) {
    day.neto = day.income - day.cost;
    balance += day.neto;
    day.saldo = balance;
  }
  return days;
}

/**
 * Filter entries by criteria.
 */
export function filterEntries(entries, filters) {
  let result = entries;
  if (filters.company && filters.company !== 'ALL') {
    result = result.filter(e => e.company === filters.company);
  }
  if (filters.type && filters.type !== 'ALL') {
    result = result.filter(e => e.type === filters.type);
  }
  if (filters.subtype && filters.subtype !== 'ALL') {
    result = result.filter(e => e.subtype === filters.subtype);
  }
  if (filters.eventTipo && filters.eventTipo !== 'ALL') {
    result = result.filter(e => e.eventTipo === filters.eventTipo);
  }
  if (filters.startDate) {
    result = result.filter(e => e.date >= filters.startDate);
  }
  if (filters.endDate) {
    result = result.filter(e => e.date <= filters.endDate);
  }
  if (filters.excludeInvestments) {
    result = result.filter(e => e.subtype !== 'Inversion');
  }
  return result;
}
