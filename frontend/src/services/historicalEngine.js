import { CashFlowEntry } from '../models/CashFlowEntry.js';

/**
 * Build CashFlowEntry[] from journal data.
 * Only bank accounts (572/570/571 subcuentas) are cash movements.
 */
export function buildHistoricalEntries(journalData) {
  const entries = [];

  for (const [key, journal] of Object.entries(journalData)) {
    const [company] = key.split('_');
    if (!journal || !journal.entries) continue;

    for (const row of journal.entries) {
      const sub = String(row.subcuenta || '');
      // Bank accounts: 572*, 570*, 571*
      if (!sub.startsWith('572') && !sub.startsWith('570') && !sub.startsWith('571')) continue;

      const amount = (row.debe || 0) - (row.haber || 0);
      if (amount === 0) continue;

      entries.push(new CashFlowEntry({
        date: row.fecha,
        amount,
        type: amount >= 0 ? 'INCOME' : 'COST',
        subtype: amount >= 0 ? 'CobroReal' : 'PagoReal',
        company,
        source: 'ACTUAL',
        subcuenta: sub,
        description: row.concepto || row.descripcion || '',
      }));
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

/**
 * Group entries by month for comparison.
 */
export function getMonthlyTotals(entries) {
  const byMonth = {};
  for (const e of entries) {
    const month = e.date.substring(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, income: 0, cost: 0, net: 0, count: 0 };
    if (e.type === 'INCOME') byMonth[month].income += e.amount;
    else byMonth[month].cost += Math.abs(e.amount);
    byMonth[month].count++;
  }
  for (const m of Object.values(byMonth)) {
    m.net = m.income - m.cost;
  }
  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}
