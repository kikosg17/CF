import { readFileSync, existsSync } from 'fs';
import { read, utils } from 'xlsx';

const COMPANY_MAP = {
  'portaceli': 'PO', 'la torre': 'PO', 'torre': 'PO',
  'huerta': 'TU', 'pueblo': 'TU', 'turia': 'TU',
  'recetas': 'RA', 'autores': 'RA',
  'moier': 'MO',
};

function mapCompany(name) {
  if (!name) return 'PO';
  const lower = name.toLowerCase();
  for (const [key, code] of Object.entries(COMPANY_MAP)) {
    if (lower.includes(key)) return code;
  }
  return 'PO';
}

function parseSerialDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400000));
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDate(d) {
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

export function parseEvents(filePath) {
  if (!existsSync(filePath)) {
    console.log(`[eventParser] File not found: ${filePath}`);
    return [];
  }

  const buf = readFileSync(filePath);
  const wb = read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row by searching for "fecha cierre"
  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c).toLowerCase().trim());
    if (row.some(c => c.includes('fecha cierre') || c.includes('fecha_cierre'))) {
      headerIdx = i;
      headers = row;
      break;
    }
  }

  if (headerIdx === -1) {
    console.log('[eventParser] Could not find header row');
    return [];
  }

  const col = (name) => headers.findIndex(h => h.includes(name));
  const iFC = col('fecha cierre') !== -1 ? col('fecha cierre') : col('fecha_cierre');
  const iFE = col('fecha evento') !== -1 ? col('fecha evento') : col('fecha_evento');
  const iTipo = col('tipo');
  const iNombre = col('nombre');
  const iPax = col('pax');
  const iPrecio = col('precio') !== -1 ? col('precio') : col('menu');
  const iCompany = col('empresa') !== -1 ? col('empresa') : col('sociedad');
  const iAlquiler = col('alquiler');

  const events = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;

    const fechaEvento = parseSerialDate(r[iFE >= 0 ? iFE : iFC]);
    const fechaCierre = parseSerialDate(r[iFC >= 0 ? iFC : iFE]);
    if (!fechaEvento) continue;

    events.push({
      id: i,
      nombre: String(r[iNombre >= 0 ? iNombre : 0] || `Evento #${i}`),
      tipo: String(r[iTipo >= 0 ? iTipo : 1] || 'Evento'),
      company: iCompany >= 0 ? mapCompany(String(r[iCompany])) : 'PO',
      fechaCierre: formatDate(fechaCierre || fechaEvento),
      fechaEvento: formatDate(fechaEvento),
      paxContratados: Number(r[iPax >= 0 ? iPax : 4]) || 100,
      precioMenu: Number(r[iPrecio >= 0 ? iPrecio : 5]) || 0,
      importeAlquiler: iAlquiler >= 0 ? Number(r[iAlquiler]) || 0 : 0,
      cobrado: 0,
      observaciones: '',
    });
  }

  return events;
}
