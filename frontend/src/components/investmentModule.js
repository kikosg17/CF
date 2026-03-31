import Chart from 'chart.js/auto';
import { calculateInvestmentMetrics, generateInvestmentFlows } from '../services/investmentEngine.js';
import { saveHypotheses } from '../services/hypothesisStore.js';
import { formatCurrencyShort, formatCurrencyCompact, formatPercent } from '../utils/format.js';
import { toDateStr, today } from '../utils/dates.js';
import { rgba } from '../utils/colors.js';
import { showToast } from './toast.js';

let invChart = null;
let detailChart = null;

export function renderInvestmentModule(container, state) {
  const hyp = state.hypotheses;
  const investments = hyp.investments || [];
  const view = state._invView || 'list'; // 'list' or 'detail'
  const selectedId = state._invSelectedId || null;

  if (view === 'detail' && selectedId !== null) {
    renderInvestmentDetail(container, state, selectedId);
  } else {
    renderInvestmentList(container, state);
  }
}

function renderInvestmentList(container, state) {
  const hyp = state.hypotheses;
  const investments = hyp.investments || [];
  const horizonEnd = hyp.horizonEnd || '2027-12-31';

  // Aggregate metrics
  const activeInvs = investments.filter(inv => inv.active);
  let totalCapex = 0, totalNetMonth = 0, totalResult = 0;
  const metricsMap = {};

  for (const inv of investments) {
    const m = calculateInvestmentMetrics(inv, hyp, horizonEnd);
    metricsMap[inv.id] = m;
    if (inv.active) {
      totalCapex += m.capexTotal;
      totalNetMonth += m.netMonthly;
      totalResult += m.totalResult;
    }
  }

  container.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <h1>Inversiones</h1>
        <p>Modela y analiza inversiones del grupo</p>
      </div>
      <button class="btn btn-primary" id="inv-add">+ Nueva Inversión</button>
    </div>

    <div class="kpi-grid mb-2">
      <div class="kpi-card highlight">
        <div class="kpi-label">Inversiones Activas</div>
        <div class="kpi-value">${activeInvs.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">CAPEX Total</div>
        <div class="kpi-value negative">${formatCurrencyShort(totalCapex)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cash Flow Neto/Mes</div>
        <div class="kpi-value ${totalNetMonth >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(totalNetMonth)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Resultado Acumulado</div>
        <div class="kpi-value ${totalResult >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(totalResult)}</div>
      </div>
    </div>

    ${activeInvs.length > 0 ? `
      <div class="card mb-2">
        <div class="card-header"><span class="card-title">Flujo Agregado — Inversiones Activas</span></div>
        <div class="chart-container"><canvas id="inv-agg-chart"></canvas></div>
      </div>
    ` : ''}

    <div class="inv-grid" id="inv-grid">
      ${investments.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="icon">🏗️</div>
          <p>Sin inversiones configuradas</p>
          <p class="text-muted">Haz clic en "+ Nueva Inversión" para empezar a modelar</p>
        </div>
      ` : ''}
      ${investments.map(inv => {
        const m = metricsMap[inv.id];
        return `
          <div class="inv-card">
            <div class="inv-card-header">
              <div>
                <div style="font-size:14px;font-weight:600;">${inv.name || 'Sin nombre'}</div>
                <div style="font-size:12px;color:var(--text-muted);">${inv.description || ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge ${inv.active ? 'badge-green' : 'badge-red'}">${inv.active ? 'Activa' : 'Inactiva'}</span>
                <span class="badge badge-blue">${inv.company || 'GROUP'}</span>
              </div>
            </div>
            <div class="inv-card-body">
              <div class="inv-kpi-row">
                <div class="inv-kpi">
                  <div class="inv-kpi-label">CAPEX</div>
                  <div class="inv-kpi-val negative">${formatCurrencyShort(m.capexTotal)}</div>
                </div>
                <div class="inv-kpi">
                  <div class="inv-kpi-label">Neto/Mes</div>
                  <div class="inv-kpi-val ${m.netMonthly >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(m.netMonthly)}</div>
                </div>
                <div class="inv-kpi">
                  <div class="inv-kpi-label">Payback</div>
                  <div class="inv-kpi-val">${m.paybackMonths !== null ? m.paybackMonths + ' meses' : '–'}</div>
                </div>
                <div class="inv-kpi">
                  <div class="inv-kpi-label">ROI</div>
                  <div class="inv-kpi-val ${m.roi >= 0 ? 'positive' : 'negative'}">${formatPercent(m.roi, 0)}</div>
                </div>
              </div>
            </div>
            <div class="inv-card-footer">
              <button class="btn btn-primary btn-sm" data-inv-detail="${inv.id}">Ver modelo</button>
              <button class="btn btn-secondary btn-sm" data-inv-toggle="${inv.id}">${inv.active ? 'Desactivar' : 'Activar'}</button>
              <button class="btn btn-danger btn-sm" data-inv-delete="${inv.id}">Eliminar</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Aggregate chart
  if (activeInvs.length > 0) {
    renderAggregateChart(activeInvs, hyp, horizonEnd);
  }

  // Bindings
  document.getElementById('inv-add')?.addEventListener('click', () => {
    const newInv = createEmptyInvestment();
    if (!hyp.investments) hyp.investments = [];
    hyp.investments.push(newInv);
    saveHypotheses(hyp);
    state._invView = 'detail';
    state._invSelectedId = newInv.id;
    renderInvestmentModule(container, state);
  });

  document.querySelectorAll('[data-inv-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      state._invView = 'detail';
      state._invSelectedId = btn.dataset.invDetail;
      renderInvestmentModule(container, state);
    });
  });

  document.querySelectorAll('[data-inv-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inv = hyp.investments.find(i => i.id === btn.dataset.invToggle);
      if (inv) inv.active = !inv.active;
      saveHypotheses(hyp);
      if (state.onHypChange) state.onHypChange();
      renderInvestmentModule(container, state);
    });
  });

  document.querySelectorAll('[data-inv-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      hyp.investments = hyp.investments.filter(i => i.id !== btn.dataset.invDelete);
      saveHypotheses(hyp);
      if (state.onHypChange) state.onHypChange();
      renderInvestmentModule(container, state);
      showToast('Inversión eliminada', 'info');
    });
  });
}

function renderInvestmentDetail(container, state, invId) {
  const hyp = state.hypotheses;
  const inv = (hyp.investments || []).find(i => i.id === invId);
  if (!inv) {
    state._invView = 'list';
    renderInvestmentModule(container, state);
    return;
  }

  const m = calculateInvestmentMetrics(inv, hyp, hyp.horizonEnd || '2027-12-31');

  container.innerHTML = `
    <div class="page-header">
      <button class="btn btn-secondary btn-sm mb-2" id="inv-back">← Volver a lista</button>
    </div>

    <div class="card mb-2" style="padding:20px;">
      <div class="flex-between mb-2">
        <div>
          <div class="hyp-field mb-1">
            <label>Nombre</label>
            <input type="text" id="inv-name" value="${inv.name || ''}" style="font-size:18px;font-weight:600;width:400px;">
          </div>
          <div class="hyp-field">
            <label>Descripción</label>
            <input type="text" id="inv-desc" value="${inv.description || ''}" style="width:400px;">
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div class="hyp-field">
            <label>Sociedad</label>
            <select id="inv-company">
              <option value="GROUP" ${inv.company === 'GROUP' ? 'selected' : ''}>Grupo</option>
              <option value="PO" ${inv.company === 'PO' ? 'selected' : ''}>PO</option>
              <option value="TU" ${inv.company === 'TU' ? 'selected' : ''}>TU</option>
              <option value="RA" ${inv.company === 'RA' ? 'selected' : ''}>RA</option>
              <option value="MO" ${inv.company === 'MO' ? 'selected' : ''}>MO</option>
            </select>
          </div>
          <div class="hyp-field">
            <label>Estado</label>
            <label class="toggle-switch">
              <input type="checkbox" id="inv-active" ${inv.active ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="kpi-grid mb-2">
      <div class="kpi-card"><div class="kpi-label">CAPEX</div><div class="kpi-value negative">${formatCurrencyShort(m.capexTotal)}</div></div>
      <div class="kpi-card"><div class="kpi-label">OPEX/Mes</div><div class="kpi-value negative">${formatCurrencyShort(m.opexMonthly)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Ingresos/Mes</div><div class="kpi-value positive">${formatCurrencyShort(m.revenueMonthly)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Ahorros/Mes</div><div class="kpi-value positive">${formatCurrencyShort(m.savingsMonthly)}</div></div>
      <div class="kpi-card highlight"><div class="kpi-label">Neto/Mes</div><div class="kpi-value ${m.netMonthly >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(m.netMonthly)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Payback</div><div class="kpi-value">${m.paybackMonths !== null ? m.paybackMonths + ' meses' : '–'}</div></div>
      <div class="kpi-card"><div class="kpi-label">ROI</div><div class="kpi-value ${m.roi >= 0 ? 'positive' : 'negative'}">${formatPercent(m.roi, 0)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Resultado Total</div><div class="kpi-value ${m.totalResult >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(m.totalResult)}</div></div>
    </div>

    <div class="card mb-2">
      <div class="card-header"><span class="card-title">Flujo Mensual</span></div>
      <div class="chart-container"><canvas id="inv-detail-chart"></canvas></div>
    </div>

    <!-- CAPEX Section -->
    ${renderInvSection('capex', 'CAPEX — Desembolsos Iniciales', inv.capex || [], `
      <div class="text-muted mb-1" style="font-size:12px;">Importes negativos = pagos. Ej: -50000 para una entrada.</div>
    `)}

    <!-- OPEX Section -->
    ${renderInvSection('opex', 'OPEX — Costes Recurrentes Mensuales', inv.opex || [], `
      <div class="text-muted mb-1" style="font-size:12px;">Coste mensual recurrente. Ej: alquiler, personal, mantenimiento.</div>
    `)}

    <!-- Revenue Section -->
    ${renderInvSection('revenue', 'Ingresos — Nuevos Eventos', inv.revenue || [], `
      <div class="text-muted mb-1" style="font-size:12px;">Nuevos ingresos por eventos/servicios derivados de la inversión.</div>
    `)}

    <!-- Savings Section -->
    ${renderInvSection('savings', 'Ahorros — Reducción de Costes', inv.savings || [], `
      <div class="text-muted mb-1" style="font-size:12px;">Ahorro mensual por mejora de eficiencia. Ej: ahorro electricidad, lavandería.</div>
    `)}
  `;

  // Render chart
  renderDetailChart(m);

  // Bind events
  bindDetailEvents(container, state, inv);
}

function renderInvSection(type, title, items, helpText) {
  const fieldsMap = {
    capex: ['concept:Concepto:text', 'amount:Importe:number', 'date:Fecha:date'],
    opex: ['concept:Concepto:text', 'monthlyAmount:EUR/Mes:number', 'startDate:Inicio:date', 'endDate:Fin:date'],
    revenue: ['eventType:Tipo Evento:select', 'eventsPerYear:Eventos/Año:number', 'avgPax:PAX Medio:number', 'rampUpMonths:Ramp-up (meses):number', 'startDate:Inicio:date'],
    savings: ['concept:Concepto:text', 'monthlyAmount:EUR/Mes:number', 'startDate:Inicio:date', 'endDate:Fin:date'],
  };

  const fields = fieldsMap[type] || [];

  return `
    <div class="inv-section mb-2">
      <div class="inv-section-header" data-inv-sec-toggle="${type}">
        <span style="font-weight:600;">▼ ${title} (${items.length})</span>
        <button class="btn btn-secondary btn-sm" data-inv-add-item="${type}">+ Añadir</button>
      </div>
      <div class="inv-section-body" id="inv-sec-${type}">
        ${helpText}
        ${items.length === 0 ? '<div class="text-muted" style="font-size:12px;padding:8px 0;">Sin elementos</div>' : ''}
        ${items.map((item, i) => `
          <div class="inv-item-row" data-inv-item="${type}_${i}">
            ${fields.map(f => {
              const [field, label, ftype] = f.split(':');
              if (ftype === 'select') {
                return `<select data-inv-field="${type}_${i}_${field}" title="${label}">
                  <option value="Boda" ${item[field] === 'Boda' ? 'selected' : ''}>Boda</option>
                  <option value="Evento" ${item[field] === 'Evento' ? 'selected' : ''}>Evento</option>
                  <option value="Comunion" ${item[field] === 'Comunion' ? 'selected' : ''}>Comunión</option>
                  <option value="Bautizo" ${item[field] === 'Bautizo' ? 'selected' : ''}>Bautizo</option>
                  <option value="Alquiler" ${item[field] === 'Alquiler' ? 'selected' : ''}>Alquiler</option>
                </select>`;
              }
              return `<input type="${ftype}" placeholder="${label}" title="${label}"
                data-inv-field="${type}_${i}_${field}" value="${item[field] || ''}">`;
            }).join('')}
            <button class="btn-icon" data-inv-remove="${type}_${i}" title="Eliminar">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function bindDetailEvents(container, state, inv) {
  const hyp = state.hypotheses;
  const save = () => {
    saveHypotheses(hyp);
    if (state.onHypChange) state.onHypChange();
  };
  const rerender = () => renderInvestmentModule(container, state);

  document.getElementById('inv-back')?.addEventListener('click', () => {
    state._invView = 'list';
    state._invSelectedId = null;
    rerender();
  });

  // Header fields
  document.getElementById('inv-name')?.addEventListener('change', (e) => { inv.name = e.target.value; save(); });
  document.getElementById('inv-desc')?.addEventListener('change', (e) => { inv.description = e.target.value; save(); });
  document.getElementById('inv-company')?.addEventListener('change', (e) => { inv.company = e.target.value; save(); });
  document.getElementById('inv-active')?.addEventListener('change', (e) => { inv.active = e.target.checked; save(); rerender(); });

  // Section toggles
  document.querySelectorAll('[data-inv-sec-toggle]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const type = el.dataset.invSecToggle;
      const body = document.getElementById(`inv-sec-${type}`);
      if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
    });
  });

  // Add item buttons
  document.querySelectorAll('[data-inv-add-item]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.dataset.invAddItem;
      if (!inv[type]) inv[type] = [];
      const templates = {
        capex: { concept: '', amount: 0, date: toDateStr(today()) },
        opex: { concept: '', monthlyAmount: 0, startDate: toDateStr(today()), endDate: '' },
        revenue: { eventType: 'Evento', eventsPerYear: 12, avgPax: 100, rampUpMonths: 6, startDate: toDateStr(today()) },
        savings: { concept: '', monthlyAmount: 0, startDate: toDateStr(today()), endDate: '' },
      };
      inv[type].push(templates[type] || {});
      save();
      rerender();
    });
  });

  // Field changes
  document.querySelectorAll('[data-inv-field]').forEach(el => {
    el.addEventListener('change', () => {
      const parts = el.dataset.invField.split('_');
      const type = parts[0], idx = Number(parts[1]), field = parts.slice(2).join('_');
      if (!inv[type] || !inv[type][idx]) return;
      const val = el.type === 'number' ? Number(el.value) : el.value;
      inv[type][idx][field] = val;
      save();
      // Rerender to update metrics
      rerender();
    });
  });

  // Remove items
  document.querySelectorAll('[data-inv-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [type, idx] = btn.dataset.invRemove.split('_');
      if (inv[type]) inv[type].splice(Number(idx), 1);
      save();
      rerender();
    });
  });
}

function renderAggregateChart(activeInvs, hyp, horizonEnd) {
  const canvas = document.getElementById('inv-agg-chart');
  if (!canvas) return;
  if (invChart) invChart.destroy();

  // Combine all monthly data
  const allMonthly = {};
  for (const inv of activeInvs) {
    const m = calculateInvestmentMetrics(inv, hyp, horizonEnd);
    for (const md of m.monthlyData) {
      if (!allMonthly[md.month]) allMonthly[md.month] = { net: 0, cumulative: 0 };
      allMonthly[md.month].net += md.net;
    }
  }

  const months = Object.keys(allMonthly).sort();
  let cumulative = 0;
  const netData = [];
  const cumData = [];
  for (const m of months) {
    cumulative += allMonthly[m].net;
    netData.push(allMonthly[m].net);
    cumData.push(cumulative);
  }

  invChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Neto/Mes',
          data: netData,
          backgroundColor: netData.map(v => v >= 0 ? rgba('#22c55e', 0.7) : rgba('#ef4444', 0.7)),
          yAxisID: 'y',
        },
        {
          label: 'Acumulado',
          data: cumData,
          type: 'line',
          borderColor: '#a855f7',
          backgroundColor: rgba('#a855f7', 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#9aa0b0', font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrencyShort(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 }, maxRotation: 45 }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y: { position: 'left', ticks: { color: '#6b7280', callback: v => formatCurrencyCompact(v) }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y2: { position: 'right', ticks: { color: '#a855f7', callback: v => formatCurrencyCompact(v) }, grid: { display: false } },
      },
    },
  });
}

function renderDetailChart(metrics) {
  const canvas = document.getElementById('inv-detail-chart');
  if (!canvas) return;
  if (detailChart) detailChart.destroy();

  const data = metrics.monthlyData;
  if (!data.length) return;

  detailChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'Neto/Mes',
          data: data.map(d => d.net),
          backgroundColor: data.map(d => d.net >= 0 ? rgba('#22c55e', 0.7) : rgba('#ef4444', 0.7)),
          yAxisID: 'y',
        },
        {
          label: 'Acumulado',
          data: data.map(d => d.cumulative),
          type: 'line',
          borderColor: '#a855f7',
          backgroundColor: rgba('#a855f7', 0.1),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#9aa0b0', font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrencyShort(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 }, maxRotation: 45 }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y: { position: 'left', ticks: { color: '#6b7280', callback: v => formatCurrencyCompact(v) }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y2: { position: 'right', ticks: { color: '#a855f7', callback: v => formatCurrencyCompact(v) }, grid: { display: false } },
      },
    },
  });
}

function createEmptyInvestment() {
  return {
    id: 'inv_' + Date.now(),
    name: 'Nueva Inversión',
    description: '',
    company: 'GROUP',
    active: true,
    startDate: toDateStr(today()),
    capex: [],
    opex: [],
    revenue: [],
    savings: [],
  };
}
