// Sample data generator for when Excel files are not available
// This generates realistic event and journal data for the hospitality group

const COMPANIES = {
  PO: 'La Torre / Portaceli',
  TU: 'La Huerta / El Pueblo / Turia',
  RA: 'Recetas de Autores',
  MO: 'Moier Events',
};

const EVENT_TYPES = ['Boda', 'Evento', 'Comunion', 'Bautizo', 'Alquiler'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export function generateSampleEvents() {
  const events = [];
  let id = 1;
  const companies = Object.keys(COMPANIES);

  // Generate events for 2024, 2025, 2026, 2027
  for (let year = 2024; year <= 2027; year++) {
    // Seasonality: more events in spring/summer
    const monthWeights = [3, 4, 6, 8, 10, 12, 10, 8, 10, 8, 5, 4]; // Jan-Dec
    for (let month = 0; month < 12; month++) {
      const numEvents = Math.round(monthWeights[month] * (0.8 + Math.random() * 0.4));
      for (let i = 0; i < numEvents; i++) {
        const tipo = EVENT_TYPES[randomBetween(0, EVENT_TYPES.length - 1)];
        const company = companies[randomBetween(0, companies.length - 1)];
        const fechaEvento = new Date(year, month, randomBetween(1, 28));
        const fechaCierre = new Date(fechaEvento.getTime() - randomBetween(30, 180) * 86400000);

        let paxContratados;
        switch (tipo) {
          case 'Boda': paxContratados = randomBetween(80, 250); break;
          case 'Evento': paxContratados = randomBetween(30, 200); break;
          case 'Comunion': paxContratados = randomBetween(40, 120); break;
          case 'Bautizo': paxContratados = randomBetween(30, 80); break;
          case 'Alquiler': paxContratados = randomBetween(50, 300); break;
        }

        // For past events, mark some as partially/fully cobrado
        const isPast = fechaEvento < new Date();
        const cobrado = isPast ? randomBetween(60, 100) : randomBetween(0, 40);

        events.push({
          id: id++,
          nombre: `${tipo} #${id} - ${COMPANIES[company].split('/')[0].trim()}`,
          tipo,
          company,
          companyName: COMPANIES[company],
          fechaCierre: formatDate(fechaCierre),
          fechaEvento: formatDate(fechaEvento),
          paxContratados,
          precioMenu: tipo === 'Alquiler' ? 0 : randomBetween(70, 180),
          importeAlquiler: tipo === 'Alquiler' ? randomBetween(3000, 15000) : 0,
          cobrado,
          observaciones: '',
        });
      }
    }
  }
  return events;
}

export function generateSampleJournal(company, year) {
  const entries = [];
  const bankAccounts = ['5720001', '5720002', '5700001', '5710001'];
  const subcuentas = {
    income: ['7000001', '7050001', '7090001'],
    expense: ['6000001', '6200001', '6210001', '6220001', '6280001', '6290001', '6300001'],
    bank: bankAccounts,
  };

  // Generate ~20-40 entries per month
  for (let month = 0; month < 12; month++) {
    const numEntries = randomBetween(20, 40);
    for (let i = 0; i < numEntries; i++) {
      const day = randomBetween(1, 28);
      const fecha = new Date(year, month, day);
      const isIncome = Math.random() > 0.45;
      const amount = isIncome
        ? randomBetween(500, 25000)
        : randomBetween(200, 12000);

      entries.push({
        fecha: formatDate(fecha),
        asiento: `A${year}${String(month + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
        subcuenta: isIncome
          ? subcuentas.bank[randomBetween(0, bankAccounts.length - 1)]
          : subcuentas.bank[randomBetween(0, bankAccounts.length - 1)],
        contrapartida: isIncome
          ? subcuentas.income[randomBetween(0, subcuentas.income.length - 1)]
          : subcuentas.expense[randomBetween(0, subcuentas.expense.length - 1)],
        debe: isIncome ? amount : 0,
        haber: isIncome ? 0 : amount,
        concepto: isIncome ? 'Cobro evento/servicio' : 'Pago proveedor/gasto',
      });
    }
  }

  return { entries, count: entries.length };
}
