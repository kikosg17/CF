import { showToast } from './toast.js';

export function renderDataLoader(container, state) {
  const eventCount = (state.rawEvents || []).length;
  const journalKeys = Object.keys(state.journalData || {});
  const journalTotal = journalKeys.reduce((s, k) => s + (state.journalData[k]?.count || 0), 0);

  container.innerHTML = `
    <div class="page-header">
      <h1>Estado de Datos</h1>
      <p>Archivos cargados y estado de las fuentes de datos</p>
    </div>

    <div class="kpi-grid mb-2">
      <div class="kpi-card highlight">
        <div class="kpi-label">Eventos</div>
        <div class="kpi-value">${eventCount}</div>
        <div class="kpi-sub">Cargados desde API</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Asientos Diario</div>
        <div class="kpi-value">${journalTotal}</div>
        <div class="kpi-sub">${journalKeys.length} archivos</div>
      </div>
    </div>

    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Fuentes de Datos</span>
        <div>
          <button class="btn btn-primary btn-sm" id="reload-events">Recargar Eventos</button>
          <button class="btn btn-secondary btn-sm" id="reload-journal">Recargar Diarios</button>
        </div>
      </div>

      <table class="data-table">
        <thead><tr><th>Fuente</th><th>Tipo</th><th>Registros</th><th>Estado</th></tr></thead>
        <tbody>
          <tr>
            <td>HE - Eventos.xlsx</td>
            <td>Eventos</td>
            <td>${eventCount}</td>
            <td><span class="badge ${eventCount > 0 ? 'badge-green' : 'badge-red'}">${eventCount > 0 ? 'OK' : 'Vacío'}</span></td>
          </tr>
          ${journalKeys.map(k => `
            <tr>
              <td>Libro Diario ${k}</td>
              <td>Contabilidad</td>
              <td>${state.journalData[k]?.count || 0}</td>
              <td><span class="badge badge-green">OK</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Notas</span></div>
      <div style="font-size:13px; color:var(--text-secondary); line-height:1.8;">
        <p>Los datos se cargan automáticamente al iniciar desde el backend (puerto 3001).</p>
        <p>Si los archivos Excel están en las rutas configuradas, se parsean automáticamente. Si no, se usan datos de ejemplo.</p>
        <p>Para cambiar las rutas, configura la variable de entorno <code>DATA_DIR</code> en el backend.</p>
      </div>
    </div>
  `;

  document.getElementById('reload-events')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/events/reload', { method: 'POST' });
      const data = await res.json();
      showToast(`Eventos recargados: ${data.count}`, 'success');
      // Trigger full reload
      if (state.onReload) state.onReload();
    } catch (e) {
      showToast('Error recargando eventos', 'error');
    }
  });

  document.getElementById('reload-journal')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/journal/reload', { method: 'POST' });
      const data = await res.json();
      showToast(`Diarios recargados: ${data.count} entradas`, 'success');
      if (state.onReload) state.onReload();
    } catch (e) {
      showToast('Error recargando diarios', 'error');
    }
  });
}
