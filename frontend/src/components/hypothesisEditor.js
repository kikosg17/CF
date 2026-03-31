import { saveHypotheses, resetHypotheses, exportHypotheses, importHypotheses } from '../services/hypothesisStore.js';
import { formatCurrencyShort } from '../utils/format.js';
import { showToast } from './toast.js';

export function renderHypothesisEditor(container, state) {
  const hyp = state.hypotheses;

  container.innerHTML = `
    <div class="page-header flex-between">
      <div>
        <h1>Hipótesis del Modelo</h1>
        <p>Configura todos los parámetros de la proyección financiera</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" id="hyp-export">Exportar JSON</button>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">
          Importar JSON
          <input type="file" accept=".json" id="hyp-import" style="display:none">
        </label>
        <button class="btn btn-danger btn-sm" id="hyp-reset">Restablecer</button>
      </div>
    </div>

    <!-- 1. General -->
    ${renderSection('general', 'Parámetros Generales', true, `
      <div class="hyp-grid">
        <div class="hyp-field">
          <label>Saldo Conocido (EUR)</label>
          <input type="number" id="hyp-saldoInicial" value="${hyp.saldoInicial}">
        </div>
        <div class="hyp-field">
          <label>Fecha del Saldo</label>
          <input type="date" id="hyp-saldoInicialFecha" value="${hyp.saldoInicialFecha || ''}">
          <small style="color:var(--text-muted);font-size:10px;">La proyección arranca desde este punto</small>
        </div>
        <div class="hyp-field">
          <label>Ratio PAX Efectivos / Contratados</label>
          <input type="number" step="0.01" id="hyp-paxRatio" value="${hyp.paxRatio}">
        </div>
        <div class="hyp-field">
          <label>Horizonte Final</label>
          <input type="date" id="hyp-horizonEnd" value="${hyp.horizonEnd}">
        </div>
      </div>
    `)}

    <!-- 2. Tickets -->
    ${renderSection('tickets', 'Tickets por Tipo de Evento (EUR/pax)', true, `
      <div class="hyp-grid">
        ${Object.entries(hyp.tickets || {}).map(([k, v]) => `
          <div class="hyp-field">
            <label>${k}</label>
            <input type="number" data-ticket="${k}" value="${v}">
          </div>
        `).join('')}
      </div>
    `)}

    <!-- 3. Reservas -->
    ${renderSection('reservas', 'Porcentaje de Reserva por Tipo', false, `
      <div class="hyp-grid">
        ${Object.entries(hyp.reservas || {}).map(([k, v]) => `
          <div class="hyp-field">
            <label>${k} (%)</label>
            <input type="number" step="0.01" data-reserva="${k}" value="${(v * 100).toFixed(0)}">
          </div>
        `).join('')}
      </div>
    `)}

    <!-- 4. Calendario de Cobros -->
    ${renderSection('cobros', 'Calendario de Cobros (días antes del evento)', false, `
      <div class="hyp-grid">
        <div class="hyp-field">
          <label>Prueba Menú</label>
          <input type="number" id="hyp-diasCobro_PruebaMenu" value="${hyp.diasCobro_PruebaMenu}">
        </div>
        <div class="hyp-field">
          <label>Showroom</label>
          <input type="number" id="hyp-diasCobro_Showroom" value="${hyp.diasCobro_Showroom}">
        </div>
        <div class="hyp-field">
          <label>Pago Parcial (60%)</label>
          <input type="number" id="hyp-diasCobro_Parcial" value="${hyp.diasCobro_Parcial}">
        </div>
        <div class="hyp-field">
          <label>Pago Final</label>
          <input type="number" id="hyp-diasCobro_Final" value="${hyp.diasCobro_Final}">
        </div>
        <div class="hyp-field">
          <label>Liquidación (Evento/Comunión/Bautizo)</label>
          <input type="number" id="hyp-diasCobro_Liquidacion" value="${hyp.diasCobro_Liquidacion}">
        </div>
      </div>
    `)}

    <!-- 5. Costes Variables (detallados) -->
    ${renderSection('costesVar', 'Costes Variables por PAX', true, `
      <div id="vc-editor"></div>
    `)}

    <!-- 6. Costes Estructurales -->
    ${renderSection('costesEst', 'Costes Estructurales Mensuales', true, `
      <div id="sc-editor"></div>
    `)}

    <!-- 7. Personal -->
    ${renderSection('personal', 'Costes de Personal Mensual', false, `
      <div class="hyp-grid">
        ${Object.entries(hyp.staffCosts || {}).map(([k, v]) => `
          <div class="hyp-field">
            <label>${k}</label>
            <input type="number" data-staff="${k}" value="${v}">
          </div>
        `).join('')}
      </div>
    `)}

    <!-- 8. Alertas -->
    ${renderSection('alertas', 'Umbrales de Alerta', false, `
      <div class="hyp-grid">
        <div class="hyp-field">
          <label>Saldo Bajo (EUR)</label>
          <input type="number" id="hyp-saldoBajo" value="${hyp.alertThresholds?.saldoBajo || 15000}">
        </div>
        <div class="hyp-field">
          <label>Concentración Pagos (EUR)</label>
          <input type="number" id="hyp-concentracionPagos" value="${hyp.alertThresholds?.concentracionPagos || 50000}">
        </div>
        <div class="hyp-field">
          <label>Gap Ingresos (días)</label>
          <input type="number" id="hyp-gapIngresos" value="${hyp.alertThresholds?.gapIngresos || 14}">
        </div>
        <div class="hyp-field">
          <label>Anticipación IVA (días)</label>
          <input type="number" id="hyp-ivaAnticipacion" value="${hyp.alertThresholds?.ivaAnticipacion || 30}">
        </div>
      </div>
    `)}

    <!-- 9. Deuda -->
    ${renderSection('deuda', 'Deuda y Financiación', false, `
      <div class="hyp-field mb-1">
        <label class="flex-center" style="gap:8px;">
          <input type="checkbox" id="hyp-deudaEnabled" ${hyp.deuda?.enabled ? 'checked' : ''}>
          Incluir amortización de deuda en proyección
        </label>
      </div>
      <div id="deuda-items">
        ${(hyp.deuda?.items || []).map((d, i) => renderDebtItem(d, i)).join('')}
      </div>
      <button class="btn btn-secondary btn-sm mt-1" id="add-deuda">+ Añadir Deuda</button>
    `)}
  `;

  // Render sub-editors
  renderVariableCostsEditor(hyp);
  renderStructuralCostsEditor(hyp);

  // Bind all events
  bindHypothesisEvents(state);
}

function renderSection(id, title, open, content) {
  return `
    <div class="hyp-section" id="hyp-sec-${id}">
      <div class="hyp-section-header" data-section="${id}">
        <span class="hyp-section-title">${open ? '▼' : '▶'} ${title}</span>
      </div>
      <div class="hyp-section-body" style="${open ? '' : 'display:none'}" id="hyp-body-${id}">
        ${content}
      </div>
    </div>
  `;
}

function renderDebtItem(d, i) {
  return `
    <div class="card mb-1" style="padding:12px;" data-debt-idx="${i}">
      <div class="hyp-grid">
        <div class="hyp-field"><label>Nombre</label><input type="text" data-debt-field="nombre" data-idx="${i}" value="${d.nombre || ''}"></div>
        <div class="hyp-field"><label>Cuota Mensual</label><input type="number" data-debt-field="cuotaMensual" data-idx="${i}" value="${d.cuotaMensual || 0}"></div>
        <div class="hyp-field"><label>Sociedad</label>
          <select data-debt-field="sociedad" data-idx="${i}">
            <option value="GROUP" ${d.sociedad === 'GROUP' ? 'selected' : ''}>Grupo</option>
            <option value="PO" ${d.sociedad === 'PO' ? 'selected' : ''}>PO</option>
            <option value="TU" ${d.sociedad === 'TU' ? 'selected' : ''}>TU</option>
            <option value="RA" ${d.sociedad === 'RA' ? 'selected' : ''}>RA</option>
            <option value="MO" ${d.sociedad === 'MO' ? 'selected' : ''}>MO</option>
          </select>
        </div>
        <div class="hyp-field"><label>Inicio</label><input type="date" data-debt-field="inicio" data-idx="${i}" value="${d.inicio || ''}"></div>
        <div class="hyp-field"><label>Fin</label><input type="date" data-debt-field="fin" data-idx="${i}" value="${d.fin || ''}"></div>
      </div>
      <button class="btn btn-danger btn-sm mt-1" data-remove-debt="${i}">Eliminar</button>
    </div>
  `;
}

// ===== Variable Costs Editor =====
function renderVariableCostsEditor(hyp) {
  const el = document.getElementById('vc-editor');
  if (!el) return;

  const det = hyp.variableCostsDetailed || {};
  const types = Object.keys(det);
  const activeType = types[0] || 'Boda';

  el.innerHTML = `
    <div class="vc-tabs" id="vc-tabs">
      ${types.map(t => `<button class="vc-tab ${t === activeType ? 'active' : ''}" data-vc-type="${t}">${t}</button>`).join('')}
    </div>
    <div id="vc-panels">
      ${types.map(t => renderVCPanel(t, det[t], hyp.variableCosts[t], t === activeType)).join('')}
    </div>
  `;
}

function renderVCPanel(tipo, det, simpleTotal, visible) {
  const useDetalle = det?.useDetalle || false;
  const categories = det?.categories || [];

  let total = 0;
  if (useDetalle) {
    for (const cat of categories) {
      if (cat.useSubItems && cat.subItems?.length) {
        total += cat.subItems.reduce((s, si) => s + (Number(si.amount) || 0), 0);
      } else {
        total += Number(cat.amount) || 0;
      }
    }
  } else {
    total = simpleTotal || 0;
  }

  return `
    <div class="vc-panel" id="vc-panel-${tipo}" style="${visible ? '' : 'display:none'}">
      <div class="vc-mode-toggle">
        <button class="vc-mode-btn ${!useDetalle ? 'active' : ''}" data-vc-mode="simple" data-vc-tipo="${tipo}">Simple</button>
        <button class="vc-mode-btn ${useDetalle ? 'active' : ''}" data-vc-mode="detalle" data-vc-tipo="${tipo}">Desglosado</button>
      </div>

      <div class="vc-simple" style="${useDetalle ? 'display:none' : ''}">
        <div class="hyp-field">
          <label>Coste total por PAX (EUR)</label>
          <input type="number" class="vc-simple-input" data-vc-tipo="${tipo}" value="${simpleTotal || 0}">
        </div>
      </div>

      <div class="vc-detail" style="${useDetalle ? '' : 'display:none'}">
        ${categories.map((cat, ci) => {
          const catTotal = cat.useSubItems && cat.subItems?.length
            ? cat.subItems.reduce((s, si) => s + (Number(si.amount) || 0), 0)
            : Number(cat.amount) || 0;
          return `
            <div class="vc-category" data-vc-cat="${tipo}_${ci}">
              <div class="vc-cat-header">
                <div class="vc-cat-label">
                  <span>${cat.icon || ''}</span>
                  <span>${cat.label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${cat.useSubItems ? `
                    <span class="vc-cat-amount">${catTotal.toFixed(1)} EUR</span>
                  ` : `
                    <div class="vc-cat-amount">
                      <input type="number" step="0.5" data-vc-cat-amount="${tipo}_${ci}" value="${cat.amount || 0}">
                    </div>
                  `}
                  <span style="cursor:pointer;font-size:12px;" data-vc-expand="${tipo}_${ci}">${cat.subItems?.length ? '▶' : ''}</span>
                </div>
              </div>
              ${cat.subItems?.length ? `
                <div class="vc-subitems" id="vc-sub-${tipo}_${ci}" style="display:none;">
                  <div class="vc-toggle mb-1">
                    <input type="checkbox" id="vc-use-sub-${tipo}_${ci}" data-vc-use-sub="${tipo}_${ci}" ${cat.useSubItems ? 'checked' : ''}>
                    <label for="vc-use-sub-${tipo}_${ci}">Usar desglose (suma sub-ítems)</label>
                  </div>
                  ${cat.subItems.map((si, si_idx) => `
                    <div class="vc-subitem">
                      <span>${si.label}</span>
                      <input type="number" step="0.5" data-vc-subitem="${tipo}_${ci}_${si_idx}" value="${si.amount || 0}">
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <div class="vc-total">
          <span>Total por PAX</span>
          <span class="vc-total-value" id="vc-total-${tipo}">${total.toFixed(1)} EUR</span>
        </div>
      </div>
    </div>
  `;
}

// ===== Structural Costs Editor =====
function renderStructuralCostsEditor(hyp) {
  const el = document.getElementById('sc-editor');
  if (!el) return;

  const companies = ['PO', 'TU', 'RA', 'MO'];
  const activeCo = 'PO';

  // Summary
  const totals = {};
  for (const co of companies) {
    const det = hyp.structuralCostsDetailed?.[co];
    if (det?.useDetalle) {
      totals[co] = (det.categories || []).reduce((s, cat) =>
        s + (cat.items || []).reduce((s2, item) => s2 + (Number(item.amount) || 0), 0), 0);
    } else {
      totals[co] = hyp.structuralCosts?.[co] || 0;
    }
  }
  const groupTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  el.innerHTML = `
    <div class="sc-summary">
      ${companies.map(co => `
        <div class="sc-summary-card">
          <div class="sc-summary-label">${co}</div>
          <div class="sc-summary-value" id="sc-total-${co}">${formatCurrencyShort(totals[co])}</div>
        </div>
      `).join('')}
    </div>
    <div style="text-align:center;margin-bottom:12px;font-size:14px;color:var(--text-secondary);">
      Total grupo: <strong id="sc-group-total">${formatCurrencyShort(groupTotal)}</strong>/mes
    </div>

    <div class="sc-tabs" id="sc-tabs">
      ${companies.map(co => `<button class="sc-tab ${co === activeCo ? 'active' : ''}" data-sc-co="${co}">${co}</button>`).join('')}
    </div>
    <div id="sc-panels">
      ${companies.map(co => renderSCPanel(co, hyp, co === activeCo)).join('')}
    </div>
  `;
}

function renderSCPanel(co, hyp, visible) {
  const det = hyp.structuralCostsDetailed?.[co];
  const useDetalle = det?.useDetalle || false;
  const simpleTotal = hyp.structuralCosts?.[co] || 0;
  const categories = det?.categories || [];

  return `
    <div class="sc-panel" id="sc-panel-${co}" style="${visible ? '' : 'display:none'}">
      <div class="vc-mode-toggle mb-2">
        <button class="vc-mode-btn ${!useDetalle ? 'active' : ''}" data-sc-mode="simple" data-sc-co="${co}">Simple</button>
        <button class="vc-mode-btn ${useDetalle ? 'active' : ''}" data-sc-mode="detalle" data-sc-co="${co}">Desglosado</button>
      </div>

      <div class="sc-simple" id="sc-simple-${co}" style="${useDetalle ? 'display:none' : ''}">
        <div class="hyp-field">
          <label>Total mensual ${co} (EUR)</label>
          <input type="number" data-sc-simple="${co}" value="${simpleTotal}">
        </div>
      </div>

      <div class="sc-detail" id="sc-detail-${co}" style="${useDetalle ? '' : 'display:none'}">
        ${categories.map((cat, ci) => `
          <div class="sc-category">
            <div class="sc-cat-header" data-sc-expand="${co}_${ci}">
              <span style="font-size:13px;font-weight:500;">▶ ${cat.label}</span>
              <span style="font-size:13px;color:var(--accent);" id="sc-cat-total-${co}_${ci}">
                ${formatCurrencyShort((cat.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0))}
              </span>
            </div>
            <div class="vc-subitems" id="sc-items-${co}_${ci}" style="display:none;">
              ${(cat.items || []).map((item, ii) => `
                <div class="vc-subitem">
                  <span>${item.label}</span>
                  <input type="number" data-sc-item="${co}_${ci}_${ii}" value="${item.amount || 0}">
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ===== Event Bindings =====
function bindHypothesisEvents(state) {
  const hyp = state.hypotheses;
  const save = () => { saveHypotheses(hyp); if (state.onHypChange) state.onHypChange(); };

  // Section toggles
  document.querySelectorAll('.hyp-section-header').forEach(h => {
    h.addEventListener('click', () => {
      const id = h.dataset.section;
      const body = document.getElementById(`hyp-body-${id}`);
      if (body) {
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        const title = h.querySelector('.hyp-section-title');
        if (title) title.textContent = title.textContent.replace(/^[▼▶]/, hidden ? '▼' : '▶');
      }
    });
  });

  // General fields
  const bindField = (id, setter) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { setter(el.value); save(); });
  };
  bindField('hyp-saldoInicial', v => hyp.saldoInicial = Number(v));
  bindField('hyp-saldoInicialFecha', v => hyp.saldoInicialFecha = v);
  bindField('hyp-paxRatio', v => hyp.paxRatio = Number(v));
  bindField('hyp-horizonEnd', v => hyp.horizonEnd = v);

  // Tickets
  document.querySelectorAll('[data-ticket]').forEach(el => {
    el.addEventListener('change', () => {
      if (!hyp.tickets) hyp.tickets = {};
      hyp.tickets[el.dataset.ticket] = Number(el.value);
      save();
    });
  });

  // Reservas
  document.querySelectorAll('[data-reserva]').forEach(el => {
    el.addEventListener('change', () => {
      if (!hyp.reservas) hyp.reservas = {};
      hyp.reservas[el.dataset.reserva] = Number(el.value) / 100;
      save();
    });
  });

  // Calendario cobros
  ['diasCobro_PruebaMenu', 'diasCobro_Showroom', 'diasCobro_Parcial', 'diasCobro_Final', 'diasCobro_Liquidacion'].forEach(f => {
    bindField(`hyp-${f}`, v => hyp[f] = Number(v));
  });

  // Staff costs
  document.querySelectorAll('[data-staff]').forEach(el => {
    el.addEventListener('change', () => {
      if (!hyp.staffCosts) hyp.staffCosts = {};
      hyp.staffCosts[el.dataset.staff] = Number(el.value);
      save();
    });
  });

  // Alert thresholds
  bindField('hyp-saldoBajo', v => { if (!hyp.alertThresholds) hyp.alertThresholds = {}; hyp.alertThresholds.saldoBajo = Number(v); });
  bindField('hyp-concentracionPagos', v => { if (!hyp.alertThresholds) hyp.alertThresholds = {}; hyp.alertThresholds.concentracionPagos = Number(v); });
  bindField('hyp-gapIngresos', v => { if (!hyp.alertThresholds) hyp.alertThresholds = {}; hyp.alertThresholds.gapIngresos = Number(v); });
  bindField('hyp-ivaAnticipacion', v => { if (!hyp.alertThresholds) hyp.alertThresholds = {}; hyp.alertThresholds.ivaAnticipacion = Number(v); });

  // Deuda
  bindField('hyp-deudaEnabled', () => {
    if (!hyp.deuda) hyp.deuda = { enabled: false, items: [] };
    hyp.deuda.enabled = document.getElementById('hyp-deudaEnabled')?.checked || false;
    save();
  });

  document.querySelectorAll('[data-debt-field]').forEach(el => {
    el.addEventListener('change', () => {
      const idx = Number(el.dataset.idx);
      const field = el.dataset.debtField;
      if (!hyp.deuda) hyp.deuda = { enabled: false, items: [] };
      if (!hyp.deuda.items[idx]) hyp.deuda.items[idx] = {};
      hyp.deuda.items[idx][field] = field === 'cuotaMensual' ? Number(el.value) : el.value;
      save();
    });
  });

  document.querySelectorAll('[data-remove-debt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeDebt);
      hyp.deuda.items.splice(idx, 1);
      save();
      renderHypothesisEditor(document.getElementById('main-content'), state);
    });
  });

  document.getElementById('add-deuda')?.addEventListener('click', () => {
    if (!hyp.deuda) hyp.deuda = { enabled: false, items: [] };
    hyp.deuda.items.push({ nombre: '', cuotaMensual: 0, sociedad: 'GROUP', inicio: '', fin: '' });
    save();
    renderHypothesisEditor(document.getElementById('main-content'), state);
  });

  // Variable costs tabs
  document.querySelectorAll('.vc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.vc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.vc-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById(`vc-panel-${tab.dataset.vcType}`);
      if (panel) panel.style.display = '';
    });
  });

  // VC mode toggle
  document.querySelectorAll('.vc-mode-btn[data-vc-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.vcTipo;
      const mode = btn.dataset.vcMode;
      if (!hyp.variableCostsDetailed[tipo]) return;
      hyp.variableCostsDetailed[tipo].useDetalle = mode === 'detalle';
      save();
      renderVariableCostsEditor(hyp);
      bindVCEvents(state);
    });
  });

  // VC category expand
  document.querySelectorAll('[data-vc-expand]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.vcExpand;
      const sub = document.getElementById(`vc-sub-${key}`);
      if (sub) {
        const hidden = sub.style.display === 'none';
        sub.style.display = hidden ? '' : 'none';
        btn.textContent = hidden ? '▼' : '▶';
      }
    });
  });

  bindVCEvents(state);
  bindSCEvents(state);

  // Structural costs tabs
  document.querySelectorAll('.sc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.sc-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById(`sc-panel-${tab.dataset.scCo}`);
      if (panel) panel.style.display = '';
    });
  });

  // SC mode toggle
  document.querySelectorAll('.vc-mode-btn[data-sc-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const co = btn.dataset.scCo;
      const mode = btn.dataset.scMode;
      if (!hyp.structuralCostsDetailed) hyp.structuralCostsDetailed = {};
      if (!hyp.structuralCostsDetailed[co]) hyp.structuralCostsDetailed[co] = { useDetalle: false, categories: [] };
      hyp.structuralCostsDetailed[co].useDetalle = mode === 'detalle';
      save();
      renderStructuralCostsEditor(hyp);
      bindSCEvents(state);
    });
  });

  // SC expand
  document.querySelectorAll('[data-sc-expand]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.scExpand;
      const items = document.getElementById(`sc-items-${key}`);
      if (items) {
        const hidden = items.style.display === 'none';
        items.style.display = hidden ? '' : 'none';
        const arrow = el.querySelector('span');
        if (arrow) arrow.textContent = arrow.textContent.replace(/^[▼▶]/, hidden ? '▼' : '▶');
      }
    });
  });

  // Export / Import / Reset
  document.getElementById('hyp-export')?.addEventListener('click', () => exportHypotheses(hyp));
  document.getElementById('hyp-import')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const imported = await importHypotheses(file);
      state.hypotheses = imported;
      showToast('Hipótesis importadas', 'success');
      if (state.onHypChange) state.onHypChange();
      renderHypothesisEditor(document.getElementById('main-content'), state);
    }
  });
  document.getElementById('hyp-reset')?.addEventListener('click', () => {
    state.hypotheses = resetHypotheses();
    showToast('Hipótesis restablecidas', 'info');
    if (state.onHypChange) state.onHypChange();
    renderHypothesisEditor(document.getElementById('main-content'), state);
  });
}

function bindVCEvents(state) {
  const hyp = state.hypotheses;
  const save = () => { saveHypotheses(hyp); if (state.onHypChange) state.onHypChange(); };

  // Simple input
  document.querySelectorAll('.vc-simple-input').forEach(el => {
    el.addEventListener('change', () => {
      const tipo = el.dataset.vcTipo;
      hyp.variableCosts[tipo] = Number(el.value);
      save();
    });
  });

  // Category amount
  document.querySelectorAll('[data-vc-cat-amount]').forEach(el => {
    el.addEventListener('change', () => {
      const [tipo, ci] = el.dataset.vcCatAmount.split('_');
      hyp.variableCostsDetailed[tipo].categories[Number(ci)].amount = Number(el.value);
      save();
      updateVCTotal(tipo, hyp);
    });
  });

  // Sub-item amount
  document.querySelectorAll('[data-vc-subitem]').forEach(el => {
    el.addEventListener('change', () => {
      const parts = el.dataset.vcSubitem.split('_');
      const tipo = parts[0], ci = Number(parts[1]), si = Number(parts[2]);
      hyp.variableCostsDetailed[tipo].categories[ci].subItems[si].amount = Number(el.value);
      save();
      updateVCTotal(tipo, hyp);
    });
  });

  // Use sub-items toggle
  document.querySelectorAll('[data-vc-use-sub]').forEach(el => {
    el.addEventListener('change', () => {
      const [tipo, ci] = el.dataset.vcUseSub.split('_');
      hyp.variableCostsDetailed[tipo].categories[Number(ci)].useSubItems = el.checked;
      save();
      renderVariableCostsEditor(hyp);
      bindVCEvents(state);
    });
  });
}

function updateVCTotal(tipo, hyp) {
  const det = hyp.variableCostsDetailed[tipo];
  if (!det) return;
  let total = 0;
  for (const cat of det.categories) {
    if (cat.useSubItems && cat.subItems?.length) {
      total += cat.subItems.reduce((s, si) => s + (Number(si.amount) || 0), 0);
    } else {
      total += Number(cat.amount) || 0;
    }
  }
  const el = document.getElementById(`vc-total-${tipo}`);
  if (el) el.textContent = `${total.toFixed(1)} EUR`;
}

function bindSCEvents(state) {
  const hyp = state.hypotheses;
  const save = () => { saveHypotheses(hyp); if (state.onHypChange) state.onHypChange(); };

  // Simple input
  document.querySelectorAll('[data-sc-simple]').forEach(el => {
    el.addEventListener('change', () => {
      const co = el.dataset.scSimple;
      hyp.structuralCosts[co] = Number(el.value);
      save();
      updateSCTotals(hyp);
    });
  });

  // Detail items
  document.querySelectorAll('[data-sc-item]').forEach(el => {
    el.addEventListener('change', () => {
      const parts = el.dataset.scItem.split('_');
      const co = parts[0], ci = Number(parts[1]), ii = Number(parts[2]);
      const det = hyp.structuralCostsDetailed[co];
      if (det?.categories?.[ci]?.items?.[ii]) {
        det.categories[ci].items[ii].amount = Number(el.value);
        save();
        updateSCTotals(hyp);
      }
    });
  });
}

function updateSCTotals(hyp) {
  const companies = ['PO', 'TU', 'RA', 'MO'];
  let groupTotal = 0;
  for (const co of companies) {
    const det = hyp.structuralCostsDetailed?.[co];
    let total;
    if (det?.useDetalle) {
      total = (det.categories || []).reduce((s, cat) =>
        s + (cat.items || []).reduce((s2, it) => s2 + (Number(it.amount) || 0), 0), 0);
    } else {
      total = hyp.structuralCosts?.[co] || 0;
    }
    groupTotal += total;
    const el = document.getElementById(`sc-total-${co}`);
    if (el) el.textContent = formatCurrencyShort(total);
  }
  const gel = document.getElementById('sc-group-total');
  if (gel) gel.textContent = formatCurrencyShort(groupTotal);
}
