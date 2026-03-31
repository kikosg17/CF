export function renderNavbar(activeRoute) {
  const links = [
    { hash: '#dashboard', icon: '📊', label: 'Dashboard' },
    { hash: '#cashflow', icon: '💰', label: 'Flujo de Caja' },
    { hash: '#alerts', icon: '🔔', label: 'Alertas' },
    { hash: '#events', icon: '📅', label: 'Eventos Pipeline' },
    { hash: '#historical', icon: '📈', label: 'Histórico' },
    { hash: '#hypotheses', icon: '⚙️', label: 'Hipótesis' },
    { hash: '#investments', icon: '🏗️', label: 'Inversiones' },
    { hash: '#data', icon: '📁', label: 'Datos' },
  ];

  const el = document.getElementById('navbar');
  if (!el) return;

  el.innerHTML = `
    <div class="nav-brand">
      <h2>TesoreríaVision</h2>
      <small>Proyección Financiera</small>
    </div>
    ${links.map(l => `
      <a class="nav-link ${activeRoute === l.hash ? 'active' : ''}" href="${l.hash}">
        <span class="icon">${l.icon}</span>
        <span>${l.label}</span>
      </a>
    `).join('')}
    <div class="nav-section">Info</div>
    <div class="nav-link" style="font-size:11px; color:var(--text-muted); cursor:default; padding:6px 20px;">
      v1.0 — Grupo Hospitality
    </div>
  `;
}
