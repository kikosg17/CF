import { formatCurrencyShort, formatDate, formatPercent } from '../utils/format.js';
import { today, toDateStr } from '../utils/dates.js';
import { EVENT_TYPE_COLORS, COMPANY_COLORS } from '../utils/colors.js';
import { getPaymentSchedule } from '../models/Event.js';

export function renderEventsPipeline(container, state) {
  const events = state.rawEvents || [];
  const hyp = state.hypotheses;
  const now = toDateStr(today());

  // Compute metrics for each event
  const enriched = events.map(ev => {
    const schedule = getPaymentSchedule(ev, hyp);
    const totalIncome = schedule.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const totalCost = schedule.filter(p => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);
    const pastPayments = schedule.filter(p => p.amount > 0 && p.date <= now);
    const cobrado = pastPayments.reduce((s, p) => s + p.amount, 0);
    const pctCobrado = totalIncome > 0 ? (cobrado / totalIncome) * 100 : 0;
    const nextPayment = schedule.filter(p => p.amount > 0 && p.date > now).sort((a, b) => a.date.localeCompare(b.date))[0];

    return {
      ...ev,
      totalIncome,
      totalCost,
      cobrado,
      pctCobrado,
      nextPayment,
      schedule,
    };
  });

  // Sort by event date
  enriched.sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));

  // Filter options
  container.innerHTML = `
    <div class="page-header">
      <h1>Eventos Pipeline</h1>
      <p>${events.length} eventos cargados</p>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label>Tipo:</label>
        <select id="ev-type">
          <option value="ALL">Todos</option>
          <option value="Boda">Boda</option>
          <option value="Evento">Evento</option>
          <option value="Comunion">Comunión</option>
          <option value="Bautizo">Bautizo</option>
          <option value="Alquiler">Alquiler</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Sociedad:</label>
        <select id="ev-company">
          <option value="ALL">Todas</option>
          <option value="PO">Portaceli</option>
          <option value="TU">Turia</option>
          <option value="RA">Recetas</option>
          <option value="MO">Moier</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Estado:</label>
        <select id="ev-status">
          <option value="ALL">Todos</option>
          <option value="future">Futuros</option>
          <option value="past">Pasados</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div style="overflow-x:auto;max-height:600px;overflow-y:auto;">
        <table class="data-table" id="ev-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Sociedad</th>
              <th>PAX</th>
              <th class="amount">Ingresos</th>
              <th>% Cobrado</th>
              <th>Próx. Pago</th>
            </tr>
          </thead>
          <tbody id="ev-body"></tbody>
        </table>
      </div>
    </div>
  `;

  function render() {
    const typeFilter = document.getElementById('ev-type')?.value || 'ALL';
    const compFilter = document.getElementById('ev-company')?.value || 'ALL';
    const statusFilter = document.getElementById('ev-status')?.value || 'ALL';

    let filtered = enriched;
    if (typeFilter !== 'ALL') filtered = filtered.filter(e => e.tipo === typeFilter);
    if (compFilter !== 'ALL') filtered = filtered.filter(e => e.company === compFilter);
    if (statusFilter === 'future') filtered = filtered.filter(e => e.fechaEvento >= now);
    if (statusFilter === 'past') filtered = filtered.filter(e => e.fechaEvento < now);

    const body = document.getElementById('ev-body');
    if (!body) return;

    body.innerHTML = filtered.slice(0, 200).map(ev => {
      const barColor = ev.pctCobrado >= 80 ? 'var(--green)' : ev.pctCobrado >= 40 ? 'var(--yellow)' : 'var(--red)';
      return `
        <tr>
          <td class="truncate" style="max-width:180px" title="${ev.nombre}">${ev.nombre}</td>
          <td><span class="badge" style="background:${EVENT_TYPE_COLORS[ev.tipo] || '#888'}22; color:${EVENT_TYPE_COLORS[ev.tipo] || '#888'}">${ev.tipo}</span></td>
          <td>${formatDate(ev.fechaEvento)}</td>
          <td><span class="badge badge-blue">${ev.company}</span></td>
          <td>${ev.paxContratados}</td>
          <td class="amount positive">${formatCurrencyShort(ev.totalIncome)}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="progress-bar" style="width:80px;">
                <div class="progress-fill" style="width:${ev.pctCobrado}%; background:${barColor}"></div>
              </div>
              <span style="font-size:12px;">${formatPercent(ev.pctCobrado, 0)}</span>
            </div>
          </td>
          <td style="font-size:12px;">
            ${ev.nextPayment
              ? `${formatDate(ev.nextPayment.date)} <span class="positive">${formatCurrencyShort(ev.nextPayment.amount)}</span>`
              : '<span class="text-muted">-</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  ['ev-type', 'ev-company', 'ev-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', render);
  });

  render();
}
