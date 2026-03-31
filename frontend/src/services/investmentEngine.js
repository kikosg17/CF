import { toDateStr, parseDate, addMonths, eachMonth } from '../utils/dates.js';

/**
 * Generate cash flow entries from investment definitions.
 */
export function generateInvestmentFlows(investments, hyp, horizonEnd) {
  const flows = [];
  const endDate = parseDate(horizonEnd);

  for (const inv of investments) {
    if (!inv.active) continue;

    // CAPEX — one-time payments
    if (inv.capex) {
      for (const item of inv.capex) {
        if (!item.amount || !item.date) continue;
        if (item.date > horizonEnd) continue;
        flows.push({
          date: item.date,
          amount: -Math.abs(Number(item.amount)),
          company: inv.company || 'GROUP',
          description: `CAPEX: ${item.concept || inv.name} - ${inv.name}`,
          investmentId: inv.id,
        });
      }
    }

    // OPEX — monthly recurring costs
    if (inv.opex) {
      for (const item of inv.opex) {
        if (!item.monthlyAmount) continue;
        let d = parseDate(item.startDate || inv.startDate || toDateStr(new Date()));
        const itemEnd = item.endDate ? parseDate(item.endDate) : endDate;
        while (d <= itemEnd && d <= endDate) {
          flows.push({
            date: toDateStr(d),
            amount: -Math.abs(Number(item.monthlyAmount)),
            company: inv.company || 'GROUP',
            description: `OPEX: ${item.concept || 'Coste recurrente'} - ${inv.name}`,
            investmentId: inv.id,
          });
          d = addMonths(d, 1);
        }
      }
    }

    // Revenue — new income from events
    if (inv.revenue) {
      for (const item of inv.revenue) {
        if (!item.eventsPerYear || !item.avgPax) continue;
        const ticketPax = (hyp.tickets && hyp.tickets[item.eventType || 'Evento']) || 100;
        const costPax = (hyp.variableCosts && hyp.variableCosts[item.eventType || 'Evento']) || 55;
        const revenuePerEvent = ticketPax * item.avgPax;
        const costPerEvent = costPax * Math.round(item.avgPax * (hyp.paxRatio || 0.90));
        const netPerEvent = revenuePerEvent - costPerEvent;
        const monthlyNet = Math.round(netPerEvent * item.eventsPerYear / 12);
        const rampUpMonths = item.rampUpMonths || 0;

        let d = parseDate(item.startDate || inv.startDate || toDateStr(new Date()));
        let monthIdx = 0;
        while (d <= endDate) {
          const rampFactor = rampUpMonths > 0 && monthIdx < rampUpMonths
            ? (monthIdx + 1) / rampUpMonths
            : 1;
          const amount = Math.round(monthlyNet * rampFactor);
          if (amount !== 0) {
            flows.push({
              date: toDateStr(d),
              amount: amount,
              company: inv.company || 'GROUP',
              description: `Ingresos netos: ${item.eventType || 'Evento'} - ${inv.name}`,
              investmentId: inv.id,
            });
          }
          d = addMonths(d, 1);
          monthIdx++;
        }
      }
    }

    // Savings — cost reductions
    if (inv.savings) {
      for (const item of inv.savings) {
        if (!item.monthlyAmount) continue;
        let d = parseDate(item.startDate || inv.startDate || toDateStr(new Date()));
        const itemEnd = item.endDate ? parseDate(item.endDate) : endDate;
        while (d <= itemEnd && d <= endDate) {
          flows.push({
            date: toDateStr(d),
            amount: Math.abs(Number(item.monthlyAmount)),
            company: inv.company || 'GROUP',
            description: `Ahorro: ${item.concept || 'Reducción costes'} - ${inv.name}`,
            investmentId: inv.id,
          });
          d = addMonths(d, 1);
        }
      }
    }
  }

  return flows;
}

/**
 * Calculate investment metrics: CAPEX total, monthly net, payback, ROI.
 */
export function calculateInvestmentMetrics(inv, hyp, horizonEnd) {
  const flows = generateInvestmentFlows([inv], hyp, horizonEnd);
  const capexTotal = flows.filter(f => f.description.startsWith('CAPEX:')).reduce((s, f) => s + Math.abs(f.amount), 0);
  const monthlyFlows = {};

  for (const f of flows) {
    const month = f.date.substring(0, 7);
    if (!monthlyFlows[month]) monthlyFlows[month] = 0;
    monthlyFlows[month] += f.amount;
  }

  const months = Object.keys(monthlyFlows).sort();
  let cumulative = 0;
  let paybackMonth = null;
  const monthlyData = [];

  for (const m of months) {
    cumulative += monthlyFlows[m];
    monthlyData.push({ month: m, net: monthlyFlows[m], cumulative });
    if (!paybackMonth && cumulative > 0) paybackMonth = m;
  }

  const opexMonthly = flows.filter(f => f.description.startsWith('OPEX:')).reduce((s, f) => s + f.amount, 0) / Math.max(months.length, 1);
  const revenueMonthly = flows.filter(f => f.description.startsWith('Ingresos')).reduce((s, f) => s + f.amount, 0) / Math.max(months.length, 1);
  const savingsMonthly = flows.filter(f => f.description.startsWith('Ahorro:')).reduce((s, f) => s + f.amount, 0) / Math.max(months.length, 1);
  const netMonthly = Math.round(revenueMonthly + savingsMonthly + opexMonthly);
  const roi = capexTotal > 0 ? ((cumulative / capexTotal) * 100) : 0;

  // Payback in months from first CAPEX
  let paybackMonths = null;
  if (paybackMonth && months.length > 0) {
    const firstMonth = months[0];
    const fm = new Date(firstMonth + '-01');
    const pm = new Date(paybackMonth + '-01');
    paybackMonths = (pm.getFullYear() - fm.getFullYear()) * 12 + (pm.getMonth() - fm.getMonth());
  }

  return {
    capexTotal,
    opexMonthly: Math.round(opexMonthly),
    revenueMonthly: Math.round(revenueMonthly),
    savingsMonthly: Math.round(savingsMonthly),
    netMonthly,
    paybackMonths,
    roi: Math.round(roi),
    totalResult: cumulative,
    monthlyData,
  };
}
