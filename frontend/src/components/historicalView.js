import Chart from 'chart.js/auto';
import { formatCurrencyShort, formatCurrencyCompact, formatMonthYear } from '../utils/format.js';
import { buildHistoricalEntries, getMonthlyTotals } from '../services/historicalEngine.js';
import { rgba } from '../utils/colors.js';

let histChart = null;

export function renderHistoricalView(container, state) {
  const journalData = state.journalData || {};
  const historicalEntries = buildHistoricalEntries(journalData);
  const monthlyActual = getMonthlyTotals(historicalEntries);

  // Get projected monthly totals for comparison
  const projectedMonthly = getMonthlyTotals(state.projectedEntries || []);

  container.innerHTML = `
    <div class="page-header">
      <h1>Histórico — Real vs Proyectado</h1>
      <p>Comparación de datos reales del Libro Diario con las proyecciones</p>
    </div>

    <div class="tabs" id="hist-tabs">
      <button class="tab active" data-tab="comparison">Comparación</button>
      <button class="tab" data-tab="seasonality">Estacionalidad</button>
      <button class="tab" data-tab="journal">Libro Diario</button>
    </div>

    <div id="hist-comparison">
      <div class="card mb-2">
        <div class="card-header">
          <span class="card-title">Ingresos Reales vs Proyectados (mensual)</span>
        </div>
        <div class="chart-container"><canvas id="hist-chart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Desviaciones Mensuales</span></div>
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Mes</th><th class="amount">Real Ingresos</th><th class="amount">Real Costes</th><th class="amount">Proy. Ingresos</th><th class="amount">Desviación</th></tr>
            </thead>
            <tbody>
              ${monthlyActual.map(m => {
                const proj = projectedMonthly.find(p => p.month === m.month);
                const dev = proj ? m.income - proj.income : 0;
                return `
                  <tr>
                    <td>${m.month}</td>
                    <td class="amount positive">${formatCurrencyShort(m.income)}</td>
                    <td class="amount negative">${formatCurrencyShort(-m.cost)}</td>
                    <td class="amount">${proj ? formatCurrencyShort(proj.income) : '-'}</td>
                    <td class="amount ${dev >= 0 ? 'positive' : 'negative'}">${formatCurrencyShort(dev)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="hist-seasonality" class="hidden">
      <div class="card">
        <div class="card-header"><span class="card-title">Estacionalidad — Ingresos por Mes</span></div>
        <div class="chart-container"><canvas id="season-chart"></canvas></div>
      </div>
    </div>

    <div id="hist-journal" class="hidden">
      <div class="card">
        <div class="card-header"><span class="card-title">Entradas del Libro Diario</span></div>
        <div style="overflow-x:auto;max-height:500px;overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Fecha</th><th>Subcuenta</th><th class="amount">Debe</th><th class="amount">Haber</th><th>Concepto</th></tr>
            </thead>
            <tbody>
              ${historicalEntries.slice(0, 200).map(e => `
                <tr>
                  <td>${e.date}</td>
                  <td>${e.subcuenta}</td>
                  <td class="amount positive">${e.amount >= 0 ? formatCurrencyShort(e.amount) : ''}</td>
                  <td class="amount negative">${e.amount < 0 ? formatCurrencyShort(e.amount) : ''}</td>
                  <td class="truncate" style="max-width:200px">${e.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p class="text-muted mt-1" style="font-size:12px;">Mostrando las primeras 200 entradas de ${historicalEntries.length}</p>
      </div>
    </div>
  `;

  // Tab switching
  document.querySelectorAll('#hist-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#hist-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      document.getElementById('hist-comparison')?.classList.toggle('hidden', t !== 'comparison');
      document.getElementById('hist-seasonality')?.classList.toggle('hidden', t !== 'seasonality');
      document.getElementById('hist-journal')?.classList.toggle('hidden', t !== 'journal');

      if (t === 'seasonality') renderSeasonChart(monthlyActual);
    });
  });

  // Comparison chart
  renderComparisonChart(monthlyActual, projectedMonthly);
}

function renderComparisonChart(actual, projected) {
  const canvas = document.getElementById('hist-chart');
  if (!canvas) return;
  if (histChart) histChart.destroy();

  const allMonths = [...new Set([...actual.map(m => m.month), ...projected.map(m => m.month)])].sort();

  histChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: allMonths,
      datasets: [
        {
          label: 'Real - Ingresos',
          data: allMonths.map(m => { const a = actual.find(x => x.month === m); return a ? a.income : 0; }),
          backgroundColor: rgba('#22c55e', 0.7),
        },
        {
          label: 'Real - Costes',
          data: allMonths.map(m => { const a = actual.find(x => x.month === m); return a ? -a.cost : 0; }),
          backgroundColor: rgba('#ef4444', 0.5),
        },
        {
          label: 'Proyectado - Neto',
          data: allMonths.map(m => { const p = projected.find(x => x.month === m); return p ? p.net : 0; }),
          type: 'line',
          borderColor: '#3b82f6',
          borderDash: [5, 5],
          pointRadius: 3,
          fill: false,
          tension: 0.3,
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

let seasonChart = null;
function renderSeasonChart(monthly) {
  const canvas = document.getElementById('season-chart');
  if (!canvas) return;
  if (seasonChart) seasonChart.destroy();

  // Group by month number (0-11) across years
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const byMonth = Array(12).fill(null).map(() => []);
  for (const m of monthly) {
    const monthIdx = parseInt(m.month.split('-')[1]) - 1;
    byMonth[monthIdx].push(m.income);
  }

  const avgByMonth = byMonth.map(arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

  seasonChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Promedio Ingresos',
        data: avgByMonth,
        backgroundColor: avgByMonth.map(v => v > 0 ? rgba('#22c55e', 0.7) : rgba('#ef4444', 0.7)),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(42,45,58,0.5)' } },
        y: { ticks: { color: '#6b7280', callback: v => formatCurrencyCompact(v) }, grid: { color: 'rgba(42,45,58,0.5)' } },
      },
    },
  });
}
