import { renderNavbar } from './components/navbar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderCashflowTable } from './components/cashflowTable.js';
import { renderAlertsPanel } from './components/alertsPanel.js';
import { renderEventsPipeline } from './components/eventsPipeline.js';
import { renderHistoricalView } from './components/historicalView.js';
import { renderHypothesisEditor } from './components/hypothesisEditor.js';
import { renderInvestmentModule } from './components/investmentModule.js';
import { renderDataLoader } from './components/dataLoader.js';
import { showToast } from './components/toast.js';
import { loadHypotheses } from './services/hypothesisStore.js';
import { runProjection } from './services/projectionEngine.js';

// ===== Application State =====
const AppState = {
  rawEvents: [],
  journalData: {},
  hypotheses: loadHypotheses(),
  projectedEntries: [],
  _invView: 'list',
  _invSelectedId: null,

  // Callbacks
  onHypChange: null,
  onReload: null,
};

// ===== Data Loading =====
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

/** Wait for backend to be ready, retrying with backoff */
async function waitForBackend(maxRetries = 8) {
  for (let i = 0; i < maxRetries; i++) {
    const health = await fetchJSON('/api/health');
    if (health && health.status === 'ok') return true;
    const wait = Math.min(2000 * (i + 1), 10000);
    showToast(`Esperando al backend... (intento ${i + 1})`, 'info');
    await new Promise(r => setTimeout(r, wait));
  }
  return false;
}

async function loadData() {
  showToast('Conectando con el servidor...', 'info');

  const ready = await waitForBackend();
  if (!ready) {
    showToast('No se pudo conectar al backend. Recarga la página.', 'error');
    return;
  }

  // Load events
  const events = await fetchJSON('/api/events');
  if (events && Array.isArray(events)) {
    AppState.rawEvents = events;
  }

  // Load journals in parallel
  const journalPromises = [];
  for (const co of ['PO', 'TU', 'RA', 'MO']) {
    for (const yr of [2024, 2025]) {
      journalPromises.push(
        fetchJSON(`/api/journal/${co}/${yr}`).then(data => {
          if (data) AppState.journalData[`${co}_${yr}`] = data;
        })
      );
    }
  }
  await Promise.all(journalPromises);

  recomputeProjections();
  showToast(`${AppState.rawEvents.length} eventos cargados`, 'success');
}

function recomputeProjections() {
  AppState.projectedEntries = runProjection(AppState.rawEvents, AppState.hypotheses);
}

// ===== Router =====
const routes = {
  '#dashboard': renderDashboard,
  '#cashflow': renderCashflowTable,
  '#alerts': renderAlertsPanel,
  '#events': renderEventsPipeline,
  '#historical': renderHistoricalView,
  '#hypotheses': renderHypothesisEditor,
  '#investments': renderInvestmentModule,
  '#data': renderDataLoader,
};

function navigate() {
  const hash = window.location.hash || '#dashboard';
  const renderFn = routes[hash];
  if (!renderFn) {
    window.location.hash = '#dashboard';
    return;
  }

  renderNavbar(hash);

  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = '';

  renderFn(main, AppState);
}

// ===== Callbacks =====
AppState.onHypChange = () => {
  recomputeProjections();
  // Re-render current view
  const hash = window.location.hash || '#dashboard';
  const renderFn = routes[hash];
  if (renderFn) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '';
      renderFn(main, AppState);
    }
  }
};

AppState.onReload = async () => {
  await loadData();
  navigate();
};

// ===== Init =====
window.addEventListener('hashchange', navigate);

async function init() {
  await loadData();
  navigate();
}

init();
