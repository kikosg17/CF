import { subDays, toDateStr } from '../utils/dates.js';

/**
 * Calculate total variable cost per PAX for an event type,
 * respecting the detailed breakdown if enabled.
 */
export function getVariableCostTotal(tipo, hyp) {
  const det = hyp.variableCostsDetailed;
  if (det && det[tipo] && det[tipo].useDetalle) {
    let total = 0;
    for (const cat of det[tipo].categories) {
      if (cat.useSubItems && cat.subItems && cat.subItems.length > 0) {
        total += cat.subItems.reduce((s, si) => s + (Number(si.amount) || 0), 0);
      } else {
        total += Number(cat.amount) || 0;
      }
    }
    return total;
  }
  // Fallback to simple mode
  return (hyp.variableCosts && hyp.variableCosts[tipo]) || (hyp.variableCosts && hyp.variableCosts['Evento']) || 55;
}

/**
 * Build the payment schedule for an event based on hypotheses.
 * Returns array of { date, amount, subtype, description }
 */
export function getPaymentSchedule(event, hyp) {
  const payments = [];
  const tipo = event.tipo || 'Evento';
  const fechaEvento = new Date(event.fechaEvento);
  const paxContratados = event.paxContratados || 0;
  const paxEfectivos = Math.round(paxContratados * (hyp.paxRatio || 0.90));

  // Income side
  if (tipo === 'Alquiler') {
    // Alquiler: Reserva at close + Final -5d
    const totalImporte = event.importeAlquiler || 0;
    const reservaPct = (hyp.reservas && hyp.reservas.Alquiler) || 0.20;
    const reserva = Math.round(totalImporte * reservaPct);
    const final = totalImporte - reserva;

    if (reserva > 0) {
      payments.push({
        date: toDateStr(event.fechaCierre),
        amount: reserva,
        subtype: 'Reserva',
        description: `Reserva alquiler ${event.nombre}`,
      });
    }
    if (final > 0) {
      payments.push({
        date: toDateStr(subDays(fechaEvento, hyp.diasCobro_Final || 5)),
        amount: final,
        subtype: 'Final',
        description: `Pago final alquiler ${event.nombre}`,
      });
    }
  } else {
    // Boda / Evento / Comunion / Bautizo
    const ticketPax = (hyp.tickets && hyp.tickets[tipo]) || event.precioMenu || 100;
    const totalIngreso = ticketPax * paxContratados;
    const reservaPct = (hyp.reservas && hyp.reservas[tipo]) || 0.10;
    const reserva = Math.round(totalIngreso * reservaPct);

    // Reserva at close date
    if (reserva > 0) {
      payments.push({
        date: toDateStr(event.fechaCierre),
        amount: reserva,
        subtype: 'Reserva',
        description: `Reserva ${tipo} ${event.nombre}`,
      });
    }

    if (tipo === 'Boda') {
      // PruebaMenu: -60d
      const pm = (hyp.tickets && hyp.tickets.PruebaMenu) || 250;
      payments.push({
        date: toDateStr(subDays(fechaEvento, hyp.diasCobro_PruebaMenu || 60)),
        amount: pm,
        subtype: 'PruebaMenu',
        description: `Prueba menú ${event.nombre}`,
      });

      // Showroom: -30d
      const sw = (hyp.tickets && hyp.tickets.Showroom) || 500;
      payments.push({
        date: toDateStr(subDays(fechaEvento, hyp.diasCobro_Showroom || 30)),
        amount: sw,
        subtype: 'Showroom',
        description: `Showroom ${event.nombre}`,
      });

      // Parcial 60%: -40d
      const parcial = Math.round((totalIngreso - reserva) * 0.60);
      payments.push({
        date: toDateStr(subDays(fechaEvento, hyp.diasCobro_Parcial || 40)),
        amount: parcial,
        subtype: 'Parcial',
        description: `Pago parcial 60% ${event.nombre}`,
      });

      // Final 40%: -5d
      const finalPago = totalIngreso - reserva - parcial;
      if (finalPago > 0) {
        payments.push({
          date: toDateStr(subDays(fechaEvento, hyp.diasCobro_Final || 5)),
          amount: finalPago,
          subtype: 'Final',
          description: `Pago final 40% ${event.nombre}`,
        });
      }
    } else {
      // Evento / Comunion / Bautizo: Liquidación -5d
      const liquidacion = totalIngreso - reserva;
      if (liquidacion > 0) {
        payments.push({
          date: toDateStr(subDays(fechaEvento, hyp.diasCobro_Liquidacion || 5)),
          amount: liquidacion,
          subtype: 'Liquidacion',
          description: `Liquidación ${tipo} ${event.nombre}`,
        });
      }
    }
  }

  // Cost side: Variable cost on event day
  const costoVarPax = getVariableCostTotal(tipo, hyp);
  const costTotal = Math.round(costoVarPax * paxEfectivos);
  if (costTotal > 0) {
    payments.push({
      date: toDateStr(fechaEvento),
      amount: -costTotal,
      subtype: 'CosteVariable',
      description: `Coste variable ${tipo} ${event.nombre} (${paxEfectivos} pax x ${costoVarPax})`,
    });
  }

  return payments.map(p => ({
    ...p,
    company: event.company,
    eventId: event.id,
    eventNombre: event.nombre,
    eventTipo: tipo,
    paxEfectivos,
  }));
}
