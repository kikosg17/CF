import { generateAlerts } from '../services/alertEngine.js';
import { getDailyAggregates } from '../services/projectionEngine.js';
import { formatDate } from '../utils/format.js';

export function renderAlertsPanel(container, state) {
  const dailyAgg = getDailyAggregates(state.projectedEntries || [], state.hypotheses.saldoInicial);
  const alerts = generateAlerts(dailyAgg, state.hypotheses);

  const bySeverity = {
    critical: alerts.filter(a => a.severity === 'critical'),
    warning: alerts.filter(a => a.severity === 'warning'),
    recommendation: alerts.filter(a => a.severity === 'recommendation'),
    info: alerts.filter(a => a.severity === 'info'),
  };

  container.innerHTML = `
    <div class="page-header">
      <h1>Alertas y Recomendaciones</h1>
      <p>Análisis automático de la proyección de tesorería</p>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card" style="border-left:3px solid var(--red)">
        <div class="kpi-label">Críticas</div>
        <div class="kpi-value negative">${bySeverity.critical.length}</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--orange)">
        <div class="kpi-label">Avisos</div>
        <div class="kpi-value" style="color:var(--orange)">${bySeverity.warning.length}</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--accent)">
        <div class="kpi-label">Recomendaciones</div>
        <div class="kpi-value" style="color:var(--accent)">${bySeverity.recommendation.length}</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--yellow)">
        <div class="kpi-label">Info</div>
        <div class="kpi-value" style="color:var(--yellow)">${bySeverity.info.length}</div>
      </div>
    </div>

    ${alerts.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <div class="icon">✅</div>
          <p>No hay alertas activas. La tesorería se proyecta estable.</p>
        </div>
      </div>
    ` : ''}

    ${['critical', 'warning', 'recommendation', 'info'].map(sev => {
      const items = bySeverity[sev];
      if (!items.length) return '';
      const titles = { critical: 'Alertas Críticas', warning: 'Avisos', recommendation: 'Recomendaciones', info: 'Información' };
      return `
        <div class="card mb-2">
          <div class="card-header">
            <span class="card-title">${titles[sev]} (${items.length})</span>
          </div>
          ${items.map(a => `
            <div class="alert-card ${a.severity}">
              <span class="alert-icon">${a.icon}</span>
              <div class="alert-content">
                <div class="alert-title">${a.title}</div>
                <div class="alert-desc">${a.description}</div>
                <div class="alert-date">${a.date ? formatDate(a.date) : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('')}
  `;
}
