import { formatCurrencyShort, formatDate, formatDateShort } from '../utils/format.js';
import { toDateStr, today, addDays, getPeriodRange } from '../utils/dates.js';
import { SUBTYPE_LABELS, SUBTYPE_COLORS } from '../utils/colors.js';
import { filterEntries, getDailyAggregates } from '../services/projectionEngine.js';

const PAGE_SIZE = 100;

export function renderCashflowTable(container, state) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Flujo de Caja — Detalle Diario</h1>
      <p>Proyección día a día con saldo acumulado</p>
    </div>

    <div class="filter-bar" id="cf-filters">
      <div class="filter-group">
        <label>Desde:</label>
        <input type="date" id="cf-start" value="${toDateStr(today())}">
      </div>
      <div class="filter-group">
        <label>Hasta:</label>
        <input type="date" id="cf-end" value="${toDateStr(addDays(today(), 90))}">
      </div>
      <div class="filter-group">
        <label>Sociedad:</label>
        <select id="cf-company">
          <option value="ALL">Todas</option>
          <option value="PO">Portaceli</option>
          <option value="TU">Turia</option>
          <option value="RA">Recetas</option>
          <option value="MO">Moier</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Tipo:</label>
        <select id="cf-type">
          <option value="ALL">Todos</option>
          <option value="INCOME">Cobros</option>
          <option value="COST">Pagos</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Subtipo:</label>
        <select id="cf-subtype">
          <option value="ALL">Todos</option>
          ${Object.keys(SUBTYPE_LABELS).map(k => `<option value="${k}">${SUBTYPE_LABELS[k]}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-secondary btn-sm" id="cf-export">Exportar CSV</button>
    </div>

    <div class="card">
      <div style="overflow-x:auto; max-height:600px; overflow-y:auto;">
        <table class="data-table" id="cf-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Tipo</th>
              <th>Sociedad</th>
              <th>Evento</th>
              <th class="amount">Importe</th>
              <th class="amount">Saldo</th>
            </tr>
          </thead>
          <tbody id="cf-body"></tbody>
        </table>
      </div>
      <div class="pagination" id="cf-pagination"></div>
    </div>

    <div class="detail-overlay" id="cf-overlay"></div>
    <div class="detail-panel" id="cf-detail">
      <button class="btn-icon detail-close" id="cf-detail-close">✕</button>
      <div id="cf-detail-content"></div>
    </div>
  `;

  let currentPage = 0;

  function getFiltered() {
    return filterEntries(state.projectedEntries || [], {
      company: document.getElementById('cf-company')?.value || 'ALL',
      type: document.getElementById('cf-type')?.value || 'ALL',
      subtype: document.getElementById('cf-subtype')?.value || 'ALL',
      startDate: document.getElementById('cf-start')?.value,
      endDate: document.getElementById('cf-end')?.value,
    });
  }

  function render() {
    const filtered = getFiltered();
    const daily = getDailyAggregates(filtered, state.hypotheses.saldoInicial);

    // Flatten daily into rows with running balance
    const rows = [];
    for (const day of daily) {
      for (const e of day.entries) {
        rows.push({ ...e, saldo: day.saldo });
      }
    }

    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    const page = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const body = document.getElementById('cf-body');
    if (body) {
      body.innerHTML = page.map(e => `
        <tr data-id="${e.id}" style="cursor:pointer">
          <td>${formatDateShort(e.date)}</td>
          <td class="truncate" style="max-width:200px" title="${e.description}">
            <span style="color:${SUBTYPE_COLORS[e.subtype] || '#888'}">${SUBTYPE_LABELS[e.subtype] || e.subtype}</span>
            ${e.eventNombre ? `<br><small class="text-muted">${e.eventNombre}</small>` : ''}
          </td>
          <td><span class="badge ${e.type === 'INCOME' ? 'badge-green' : 'badge-red'}">${e.type === 'INCOME' ? 'Cobro' : 'Pago'}</span></td>
          <td><span class="badge badge-blue">${e.company}</span></td>
          <td class="truncate" style="max-width:120px">${e.eventTipo || '-'}</td>
          <td class="amount ${e.amount >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(e.amount)}</td>
          <td class="amount ${e.saldo >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(e.saldo)}</td>
        </tr>
      `).join('');

      // Row click → detail
      body.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => {
          const id = Number(tr.dataset.id);
          const entry = page.find(e => e.id === id);
          if (entry) showDetail(entry, state);
        });
      });
    }

    // Pagination
    const pag = document.getElementById('cf-pagination');
    if (pag) {
      pag.innerHTML = `
        <button id="cf-prev" ${currentPage === 0 ? 'disabled' : ''}>← Anterior</button>
        <span>Página ${currentPage + 1} de ${totalPages} (${rows.length} registros)</span>
        <button id="cf-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Siguiente →</button>
      `;
      document.getElementById('cf-prev')?.addEventListener('click', () => { currentPage--; render(); });
      document.getElementById('cf-next')?.addEventListener('click', () => { currentPage++; render(); });
    }
  }

  // Bind filter events
  ['cf-start', 'cf-end', 'cf-company', 'cf-type', 'cf-subtype'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { currentPage = 0; render(); });
  });

  // Export CSV
  document.getElementById('cf-export')?.addEventListener('click', () => {
    const filtered = getFiltered();
    const daily = getDailyAggregates(filtered, state.hypotheses.saldoInicial);
    const rows = [];
    for (const day of daily) {
      for (const e of day.entries) {
        rows.push([e.date, e.description, e.type, e.subtype, e.company, e.eventNombre, e.amount, day.saldo].join(';'));
      }
    }
    const csv = 'Fecha;Concepto;Tipo;Subtipo;Sociedad;Evento;Importe;Saldo\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'flujo_caja.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  // Detail panel close
  document.getElementById('cf-detail-close')?.addEventListener('click', closeDetail);
  document.getElementById('cf-overlay')?.addEventListener('click', closeDetail);

  render();
}

function showDetail(entry, state) {
  const panel = document.getElementById('cf-detail');
  const overlay = document.getElementById('cf-overlay');
  const content = document.getElementById('cf-detail-content');
  if (!panel || !content) return;

  // Find all payments for same event
  let eventPayments = [];
  if (entry.eventId) {
    eventPayments = (state.projectedEntries || [])
      .filter(e => e.eventId === entry.eventId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  content.innerHTML = `
    <h3 style="margin-bottom:16px">${SUBTYPE_LABELS[entry.subtype] || entry.subtype}</h3>
    <div class="kpi-grid" style="grid-template-columns:1fr 1fr; margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-label">Importe</div>
        <div class="kpi-value ${entry.amount >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(entry.amount)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Fecha</div>
        <div class="kpi-value" style="font-size:16px">${formatDate(entry.date)}</div>
      </div>
    </div>
    <table class="data-table" style="font-size:12px; margin-bottom:12px;">
      <tr><td class="text-muted">Sociedad</td><td>${entry.company}</td></tr>
      <tr><td class="text-muted">Tipo</td><td>${entry.type}</td></tr>
      <tr><td class="text-muted">Subtipo</td><td>${SUBTYPE_LABELS[entry.subtype] || entry.subtype}</td></tr>
      <tr><td class="text-muted">Evento</td><td>${entry.eventNombre || '-'}</td></tr>
      <tr><td class="text-muted">Tipo Evento</td><td>${entry.eventTipo || '-'}</td></tr>
      <tr><td class="text-muted">PAX Efectivos</td><td>${entry.paxEfectivos || '-'}</td></tr>
      <tr><td class="text-muted">Descripción</td><td>${entry.description || '-'}</td></tr>
    </table>
    ${eventPayments.length > 1 ? `
      <h4 style="margin:16px 0 8px;">Calendario de pagos del evento</h4>
      <table class="data-table" style="font-size:12px;">
        <thead><tr><th>Fecha</th><th>Concepto</th><th class="amount">Importe</th></tr></thead>
        <tbody>
          ${eventPayments.map(p => `
            <tr ${p.id === entry.id ? 'style="background:var(--blue-dim)"' : ''}>
              <td>${formatDateShort(p.date)}</td>
              <td>${SUBTYPE_LABELS[p.subtype] || p.subtype}</td>
              <td class="amount ${p.amount >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(p.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  `;

  panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeDetail() {
  document.getElementById('cf-detail')?.classList.remove('open');
  document.getElementById('cf-overlay')?.classList.remove('open');
}
