export const DEFAULTS = {
  // --- Saldo inicial con fecha de referencia ---
  saldoInicial: 50000,
  saldoInicialFecha: '2026-03-31',

  // --- PAX ratio ---
  paxRatio: 0.90,

  // --- Tickets por tipo ---
  tickets: {
    Boda: 140,
    Evento: 85,
    Comunion: 95,
    Bautizo: 75,
    PruebaMenu: 250,
    Showroom: 500,
  },

  // --- Reservas (% del total) ---
  reservas: {
    Boda: 0.10,
    Evento: 0.15,
    Comunion: 0.15,
    Bautizo: 0.15,
    Alquiler: 0.20,
  },

  // --- Calendario de cobros (días antes del evento) ---
  diasCobro_PruebaMenu: 60,
  diasCobro_Showroom: 30,
  diasCobro_Parcial: 40,
  diasCobro_Final: 5,
  diasCobro_Liquidacion: 5,

  // --- Costes variables simples (por pax) ---
  variableCosts: {
    Boda: 91,
    Evento: 55,
    Comunion: 70,
    Bautizo: 55,
    Alquiler: 30,
  },

  // --- Costes variables DETALLADOS (por pax, por tipo de evento) ---
  variableCostsDetailed: {
    Boda: {
      useDetalle: true,
      categories: [
        { id: 'comida', label: 'Comida y Materias Primas', icon: '🍽', amount: 25, useSubItems: false,
          subItems: [
            { id: 'genero_fresco', label: 'Género fresco (carne, pescado, marisco)', amount: 16 },
            { id: 'genero_seco', label: 'Género seco y conservas', amount: 4 },
            { id: 'elaboracion', label: 'Elaboración y producción cocina', amount: 5 },
          ] },
        { id: 'bebida', label: 'Bebida', icon: '🍷', amount: 15, useSubItems: false,
          subItems: [
            { id: 'vinos', label: 'Vinos y cavas', amount: 8 },
            { id: 'licores', label: 'Licores y destilados', amount: 4 },
            { id: 'refrescos', label: 'Refrescos y aguas', amount: 3 },
          ] },
        { id: 'catering', label: 'Servicios de Catering', icon: '👨‍🍳', amount: 14, useSubItems: false, subItems: [] },
        { id: 'canonReceta', label: 'Canon por Receta', icon: '📋', amount: 3, useSubItems: false, subItems: [] },
        { id: 'personal', label: 'Personal Discontinuo', icon: '👥', amount: 22, useSubItems: true,
          subItems: [
            { id: 'sueldos', label: 'Sueldos y salarios', amount: 16 },
            { id: 'ss_empresa', label: 'Seguridad Social (empresa)', amount: 6 },
          ] },
        { id: 'mobiliario', label: 'Mobiliario y Decoración', icon: '🪑', amount: 5, useSubItems: false,
          subItems: [
            { id: 'sillas_mesas', label: 'Sillas y mesas', amount: 2 },
            { id: 'decoracion', label: 'Decoración floral y ambientación', amount: 3 },
          ] },
        { id: 'lavanderia', label: 'Lavandería y Lencería', icon: '🧺', amount: 3, useSubItems: false,
          subItems: [
            { id: 'mantelerias', label: 'Mantelería', amount: 2 },
            { id: 'servilletas', label: 'Servilletas y otros', amount: 1 },
          ] },
        { id: 'otros', label: 'Otros Aprovisionamientos', icon: '📦', amount: 4, useSubItems: false,
          subItems: [
            { id: 'menaje', label: 'Menaje desechable', amount: 1.5 },
            { id: 'limpieza', label: 'Limpieza', amount: 1.5 },
            { id: 'imprevistos', label: 'Imprevistos', amount: 1 },
          ] },
      ],
    },
    Evento: {
      useDetalle: true,
      categories: [
        { id: 'comida', label: 'Comida y Materias Primas', icon: '🍽', amount: 14, useSubItems: false,
          subItems: [
            { id: 'genero_fresco', label: 'Género fresco', amount: 8 },
            { id: 'genero_seco', label: 'Género seco', amount: 3 },
            { id: 'elaboracion', label: 'Elaboración', amount: 3 },
          ] },
        { id: 'bebida', label: 'Bebida', icon: '🍷', amount: 10, useSubItems: false,
          subItems: [
            { id: 'vinos', label: 'Vinos y cavas', amount: 5 },
            { id: 'licores', label: 'Licores', amount: 3 },
            { id: 'refrescos', label: 'Refrescos y aguas', amount: 2 },
          ] },
        { id: 'catering', label: 'Servicios de Catering', icon: '👨‍🍳', amount: 9, useSubItems: false, subItems: [] },
        { id: 'canonReceta', label: 'Canon por Receta', icon: '📋', amount: 2, useSubItems: false, subItems: [] },
        { id: 'personal', label: 'Personal Discontinuo', icon: '👥', amount: 12, useSubItems: true,
          subItems: [
            { id: 'sueldos', label: 'Sueldos y salarios', amount: 9 },
            { id: 'ss_empresa', label: 'Seguridad Social (empresa)', amount: 3 },
          ] },
        { id: 'mobiliario', label: 'Mobiliario y Decoración', icon: '🪑', amount: 3, useSubItems: false, subItems: [] },
        { id: 'lavanderia', label: 'Lavandería y Lencería', icon: '🧺', amount: 2, useSubItems: false, subItems: [] },
        { id: 'otros', label: 'Otros Aprovisionamientos', icon: '📦', amount: 3, useSubItems: false, subItems: [] },
      ],
    },
    Comunion: {
      useDetalle: true,
      categories: [
        { id: 'comida', label: 'Comida y Materias Primas', icon: '🍽', amount: 20, useSubItems: false, subItems: [] },
        { id: 'bebida', label: 'Bebida', icon: '🍷', amount: 12, useSubItems: false, subItems: [] },
        { id: 'catering', label: 'Servicios de Catering', icon: '👨‍🍳', amount: 10, useSubItems: false, subItems: [] },
        { id: 'canonReceta', label: 'Canon por Receta', icon: '📋', amount: 3, useSubItems: false, subItems: [] },
        { id: 'personal', label: 'Personal Discontinuo', icon: '👥', amount: 16, useSubItems: false, subItems: [] },
        { id: 'mobiliario', label: 'Mobiliario y Decoración', icon: '🪑', amount: 4, useSubItems: false, subItems: [] },
        { id: 'lavanderia', label: 'Lavandería', icon: '🧺', amount: 2, useSubItems: false, subItems: [] },
        { id: 'otros', label: 'Otros', icon: '📦', amount: 3, useSubItems: false, subItems: [] },
      ],
    },
    Bautizo: {
      useDetalle: true,
      categories: [
        { id: 'comida', label: 'Comida y Materias Primas', icon: '🍽', amount: 14, useSubItems: false, subItems: [] },
        { id: 'bebida', label: 'Bebida', icon: '🍷', amount: 10, useSubItems: false, subItems: [] },
        { id: 'catering', label: 'Servicios de Catering', icon: '👨‍🍳', amount: 9, useSubItems: false, subItems: [] },
        { id: 'canonReceta', label: 'Canon por Receta', icon: '📋', amount: 2, useSubItems: false, subItems: [] },
        { id: 'personal', label: 'Personal Discontinuo', icon: '👥', amount: 12, useSubItems: false, subItems: [] },
        { id: 'mobiliario', label: 'Mobiliario y Decoración', icon: '🪑', amount: 3, useSubItems: false, subItems: [] },
        { id: 'lavanderia', label: 'Lavandería', icon: '🧺', amount: 2, useSubItems: false, subItems: [] },
        { id: 'otros', label: 'Otros', icon: '📦', amount: 3, useSubItems: false, subItems: [] },
      ],
    },
    Alquiler: {
      useDetalle: false,
      categories: [
        { id: 'limpieza', label: 'Limpieza', icon: '🧹', amount: 10, useSubItems: false, subItems: [] },
        { id: 'personal', label: 'Personal', icon: '👥', amount: 10, useSubItems: false, subItems: [] },
        { id: 'consumos', label: 'Consumos', icon: '⚡', amount: 5, useSubItems: false, subItems: [] },
        { id: 'otros', label: 'Otros', icon: '📦', amount: 5, useSubItems: false, subItems: [] },
      ],
    },
  },

  // --- Costes estructurales simples (mensual por sociedad) ---
  structuralCosts: { PO: 8525, TU: 7200, RA: 4800, MO: 3500 },

  // --- Costes estructurales DETALLADOS ---
  structuralCostsDetailed: {
    PO: {
      useDetalle: false,
      categories: [
        { id: 'arrendamientos', label: 'Arrendamientos', items: [
          { id: 'alquiler_finca', label: 'Alquiler finca / local', amount: 0 },
          { id: 'alquiler_vehiculos', label: 'Alquiler vehículos', amount: 0 },
          { id: 'alquiler_maquinaria', label: 'Alquiler maquinaria', amount: 0 },
        ]},
        { id: 'suministros', label: 'Suministros', items: [
          { id: 'electricidad', label: 'Electricidad', amount: 0 },
          { id: 'agua', label: 'Agua', amount: 0 },
          { id: 'gas', label: 'Gas', amount: 0 },
          { id: 'telefonia', label: 'Telefonía e Internet', amount: 0 },
        ]},
        { id: 'seguros', label: 'Seguros', items: [
          { id: 'seguro_rc', label: 'Seguro RC', amount: 0 },
          { id: 'seguro_local', label: 'Seguro local/finca', amount: 0 },
          { id: 'seguro_vehiculos', label: 'Seguro vehículos', amount: 0 },
        ]},
        { id: 'mantenimiento', label: 'Mantenimiento', items: [
          { id: 'mant_instalaciones', label: 'Mantenimiento instalaciones', amount: 0 },
          { id: 'mant_jardineria', label: 'Jardinería', amount: 0 },
          { id: 'mant_piscina', label: 'Piscina', amount: 0 },
          { id: 'mant_limpieza', label: 'Limpieza general', amount: 0 },
        ]},
        { id: 'servicios_ext', label: 'Servicios Externos', items: [
          { id: 'asesoria', label: 'Asesoría fiscal/contable', amount: 0 },
          { id: 'legal', label: 'Servicios jurídicos', amount: 0 },
          { id: 'marketing', label: 'Marketing y publicidad', amount: 0 },
        ]},
        { id: 'software', label: 'Software y Administración', items: [
          { id: 'licencias', label: 'Licencias software', amount: 0 },
          { id: 'material_oficina', label: 'Material de oficina', amount: 0 },
        ]},
      ],
    },
    TU: { useDetalle: false, categories: [] },
    RA: { useDetalle: false, categories: [] },
    MO: { useDetalle: false, categories: [] },
  },

  // --- Personal (mensual por sociedad) ---
  staffCosts: { PO: 12500, TU: 10800, RA: 6200, MO: 4500 },

  // --- Umbrales de alerta ---
  alertThresholds: {
    saldoNegativo: true,
    saldoBajo: 15000,
    concentracionPagos: 50000,
    gapIngresos: 14,
    ivaAnticipacion: 30,
  },

  // --- Deuda ---
  deuda: {
    enabled: false,
    items: [],
  },

  // --- Inversiones ---
  investments: [],

  // --- Horizonte ---
  horizonEnd: '2027-12-31',
};

// Deep clone
export function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}
