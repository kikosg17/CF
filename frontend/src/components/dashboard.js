import Chart from 'chart.js/auto';
import { formatCurrencyShort, formatCurrencyCompact, formatDate, formatDateShort } from '../utils/format.js';
import { today, toDateStr, addDays, getPeriodRange } from '../utils/dates.js';
import { SUBTYPE_COLORS, SUBTYPE_LABELS, COMPANY_COLORS, COMPANY_NAMES, rgba } from '../utils/colors.js';
import { filterEntries, getDailyAggregates } from '../services/projectionEngine.js';
import { generateAlerts } from '../services/alertEngine.js';

let waterfallChart = null;
let companyChart = null;

export function renderDashboard(container, state) {
  const hyp = state.hypotheses;
  const allEntries = state.projectedEntries || [];
  const now = today();
  const todayStr = toDateStr(now);

  // Default filter: next 90 days
  const defaultEnd = toDateStr(addDays(now, 90));

  container.innerHTML = `
    <div class="page-header">
      <h1>Dashboard — Tesorería del Grupo</h1>
      <p>Visión consolidada de la posición de tesorería y proyecciones</p>
    </div>

    <div class="filter-bar" id="dash-filters">
      <div class="filter-group">
        <label>Vista:</label>
        <select id="dash-view">
          <option value="month">Mes actual</option>
          <option value="quarter">Trimestre</option>
          <option value="90d" selected>Próx. 90 días</option>
          <option value="year">Año</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Sociedad:</label>
        <select id="dash-company">
          <option value="ALL">Todas</option>
          <option value="PO">Portaceli</option>
          <option value="TU">Turia</option>
          <option value="RA">Recetas</option>
          <option value="MO">Moier</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Desde:</label>
        <input type="date" id="dash-start" value="${todayStr}">
      </div>
      <div class="filter-group">
        <label>Hasta:</label>
        <input type="date" id="dash-end" value="${defaultEnd}">
      </div>
      <div class="filter-group">
        <label class="flex-center gap-1" style="gap:6px">
          <input type="checkbox" id="dash-inv-toggle" checked>
          Inversiones
        </label>
      </div>
    </div>

    <div class="kpi-grid" id="dash-kpis"></div>

    <div class="grid-2 mb-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Flujo de Tesorería — Waterfall</span>
          <span class="card-subtitle" id="dash-chart-range"></span>
        </div>
        <div class="chart-container"><canvas id="waterfall-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Distribución por Sociedad</span>
        </div>
        <div class="chart-container"><canvas id="company-chart"></canvas></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Alertas Activas</span></div>
        <div id="dash-alerts"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Próximos Movimientos</span></div>
        <div id="dash-upcoming" style="max-height:350px;overflow-y:auto;"></div>
      </div>
    </div>
  `;

  updateDashboard(state);
  bindDashFilters(state);
}

function bindDashFilters(state) {
  const view = document.getElementById('dash-view');
  const company = document.getElementById('dash-company');
  const start = document.getElementById('dash-start');
  const end = document.getElementById('dash-end');
  const invToggle = document.getElementById('dash-inv-toggle');

  const update = () => updateDashboard(state);
  if (view) view.addEventListener('change', () => {
    const now = today();
    let s, e;
    switch (view.value) {
      case 'month': { const r = getPeriodRange('month', now); s = r.start; e = r.end; break; }
      case 'quarter': { const r = getPeriodRange('quarter', now); s = r.start; e = r.end; break; }
      case '90d': { s = now; e = addDays(now, 90); break; }
      case 'year': { const r = getPeriodRange('year', now); s = r.start; e = r.end; break; }
      default: return;
    }
    if (start) start.value = toDateStr(s);
    if (end) end.value = toDateStr(e);
    update();
  });
  if (company) company.addEventListener('change', update);
  if (start) start.addEventListener('change', update);
  if (end) end.addEventListener('change', update);
  if (invToggle) invToggle.addEventListener('change', update);
}

function updateDashboard(state) {
  const hyp = state.hypotheses;
  const allEntries = state.projectedEntries || [];
  const company = document.getElementById('dash-company')?.value || 'ALL';
  const startDate = document.getElementById('dash-start')?.value || toDateStr(today());
  const endDate = document.getElementById('dash-end')?.value || toDateStr(addDays(today(), 90));
  const includeInv = document.getElementById('dash-inv-toggle')?.checked !== false;

  const filtered = filterEntries(allEntries, {
    company: company,
    startDate,
    endDate,
    excludeInvestments: !includeInv,
  });

  const dailyAgg = getDailyAggregates(filtered, hyp.saldoInicial, hyp.saldoInicialFecha);
  const alerts = generateAlerts(dailyAgg, hyp);

  // KPIs
  const totalIncome = filtered.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0);
  const totalCost = filtered.filter(e => e.type === 'COST').reduce((s, e) => s + Math.abs(e.amount), 0);
  const lastDay = dailyAgg[dailyAgg.length - 1];
  const saldoFinal = lastDay ? lastDay.saldo : hyp.saldoInicial;
  const minSaldo = dailyAgg.length ? Math.min(...dailyAgg.map(d => d.saldo)) : hyp.saldoInicial;

  const kpiEl = document.getElementById('dash-kpis');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="kpi-card highlight">
        <div class="kpi-label">Saldo Conocido</div>
        <div class="kpi-value">${formatCurrencyShort(hyp.saldoInicial)}</div>
        <div class="kpi-sub">a ${formatDate(hyp.saldoInicialFecha || toDateStr(today()))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cobros Periodo</div>
        <div class="kpi-value positive">+${formatCurrencyCompact(totalIncome)}</div>
        <div class="kpi-sub">${filtered.filter(e => e.type === 'INCOME').length} movimientos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pagos Periodo</div>
        <div class="kpi-value negative">-${formatCurrencyCompact(totalCost)}</div>
        <div class="kpi-sub">${filtered.filter(e => e.type === 'COST').length} movimientos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Saldo Final Proyectado</div>
        <div class="kpi-value ${saldoFinal >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(saldoFinal)}</div>
        <div class="kpi-sub">Mín: ${formatCurrencyShort(minSaldo)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Alertas</div>
        <div class="kpi-value ${alerts.some(a => a.severity === 'critical') ? 'negative' : ''}">${alerts.length}</div>
        <div class="kpi-sub">${alerts.filter(a => a.severity === 'critical').length} críticas</div>
      </div>
    `;
  }

  // Waterfall Chart
  renderWaterfallChart(dailyAgg);

  // Company distribution
  renderCompanyChart(filtered);

  // Alerts
  const alertsEl = document.getElementById('dash-alerts');
  if (alertsEl) {
    if (alerts.length === 0) {
      alertsEl.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>Sin alertas activas</p></div>';
    } else {
      alertsEl.innerHTML = alerts.slice(0, 5).map(a => `
        <div class="alert-card ${a.severity}">
          <span class="alert-icon">${a.icon}</span>
          <div class="alert-content">
            <div class="alert-title">${a.title}</div>
            <div class="alert-desc">${a.description}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Upcoming movements
  const upcomingEl = document.getElementById('dash-upcoming');
  if (upcomingEl) {
    const upcoming = filtered
      .filter(e => e.date >= toDateStr(today()))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15);

    if (upcoming.length === 0) {
      upcomingEl.innerHTML = '<div class="empty-state"><p>Sin movimientos próximos</p></div>';
    } else {
      upcomingEl.innerHTML = `<table class="data-table">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Sociedad</th><th class="amount">Importe</th></tr></thead>
        <tbody>${upcoming.map(e => `
          <tr>
            <td>${formatDateShort(e.date)}</td>
            <td class="truncate" style="max-width:180px" title="${e.description}">${SUBTYPE_LABELS[e.subtype] || e.subtype}</td>
            <td><span class="badge badge-blue">${e.company}</span></td>
            <td class="amount ${e.amount >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(e.amount)}</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
    }
  }

  // Chart range label
  const rangeEl = document.getElementById('dash-chart-range');
  if (rangeEl) rangeEl.textContent = `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

function renderWaterfallChart(dailyAgg) {
  const canvas = document.getElementById('waterfall-chart');
  if (!canvas) return;
  if (waterfallChart) waterfallChart.destroy();

  // Sample to max ~60 points for readability
  const step = Math.max(1, Math.floor(dailyAgg.length / 60));
  const sampled = dailyAgg.filter((_, i) => i % step === 0 || i === dailyAgg.length - 1);

  const labels = sampled.map(d => formatDateShort(d.date));
  const incomeData = sampled.map(d => d.income);
  const costData = sampled.map(d => -d.cost);
  const balanceData = sampled.map(d => d.saldo);

  // Per-bar colors: faded for pre-reference days, vivid for projected
  const incomeColors = sampled.map(d => d.isProjected === false ? rgba('#22c55e', 0.2) : rgba('#22c55e', 0.7));
  const costColors = sampled.map(d => d.isProjected === false ? rgba('#ef4444', 0.2) : rgba('#ef4444', 0.7));
  const balanceColors = sampled.map(d => d.isProjected === false ? rgba('#3b82f6', 0.15) : '#3b82f6');
  const balanceSegment = {
    borderColor: ctx => {
      const idx = ctx.p0DataIndex;
      return sampled[idx] && sampled[idx].isProjected === false ? rgba('#3b82f6', 0.3) : '#3b82f6';
    },
    borderDash: ctx => {
      const idx = ctx.p0DataIndex;
      return sampled[idx] && sampled[idx].isProjected === false ? [4, 4] : [];
    },
  };

  // Find the reference date index for the annotation
  const refIdx = sampled.findIndex(d => d.isProjected === true);

  waterfallChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cobros',
          data: incomeData,
          backgroundColor: incomeColors,
          stack: 'flow',
          yAxisID: 'y',
          order: 2,
        },
        {
          label: 'Pagos',
          data: costData,
          backgroundColor: costColors,
          stack: 'flow',
          yAxisID: 'y',
          order: 2,
        },
        {
          label: 'Saldo Acumulado',
          data: balanceData,
          type: 'line',
          borderColor: '#3b82f6',
          backgroundColor: rgba('#3b82f6', 0.08),
          fill: true,
          tension: 0.3,
          pointRadius: sampled.map((d, i) => i === refIdx ? 6 : 0),
          pointBackgroundColor: sampled.map((d, i) => i === refIdx ? '#3b82f6' : 'transparent'),
          pointBorderColor: sampled.map((d, i) => i === refIdx ? '#fff' : 'transparent'),
          pointBorderWidth: sampled.map((d, i) => i === refIdx ? 2 : 0),
          borderWidth: 2,
          segment: balanceSegment,
          yAxisID: 'y2',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#9aa0b0', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterTitle: items => {
              const idx = items[0]?.dataIndex;
              if (idx !== undefined && sampled[idx] && sampled[idx].isProjected === false) {
                return '(estimado - antes de fecha referencia)';
              }
              return '';
            },
            label: ctx => `${ctx.dataset.label}: ${formatCurrencyShort(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: (ctx) => {
              const idx = ctx.index;
              return sampled[idx] && sampled[idx].isProjected === false ? '#3a3d4a' : '#6b7280';
            },
            font: { size: 10 },
            maxRotation: 45,
          },
          grid: { color: 'rgba(42,45,58,0.5)' },
        },
        y: { position: 'left', ticks: { color: '#6b7280', callback: v => formatCurrencyCompact(v) }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y2: { position: 'right', ticks: { color: '#3b82f6', callback: v => formatCurrencyCompact(v) }, grid: { display: false } },
      },
    },
  });
}

function renderCompanyChart(entries) {
  const canvas = document.getElementById('company-chart');
  if (!canvas) return;
  if (companyChart) companyChart.destroy();

  const byCompany = {};
  for (const e of entries) {
    const co = e.company || 'OTHER';
    if (!byCompany[co]) byCompany[co] = { income: 0, cost: 0 };
    if (e.type === 'INCOME') byCompany[co].income += e.amount;
    else byCompany[co].cost += Math.abs(e.amount);
  }

  const companies = Object.keys(byCompany);
  const incomeData = companies.map(co => byCompany[co].income);
  const costData = companies.map(co => byCompany[co].cost);

  companyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: companies.map(co => COMPANY_NAMES[co] || co),
      datasets: [
        {
          label: 'Ingresos',
          data: incomeData,
          backgroundColor: companies.map(co => rgba(COMPANY_COLORS[co] || '#888', 0.7)),
        },
        {
          label: 'Costes',
          data: costData,
          backgroundColor: companies.map(co => rgba(COMPANY_COLORS[co] || '#888', 0.3)),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9aa0b0', font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrencyShort(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y: { ticks: { color: '#6b7280', callback: v => formatCurrencyCompact(v) }, grid: { color: 'rgba(42,45,58,0.5)' } },
      },
    },
  });
}
