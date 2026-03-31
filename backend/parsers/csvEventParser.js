import { readFileSync } from 'fs';

const MONTH_MAP = {
  'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
};

const COMPANY_MAP = {
  'portaceli': 'PO',
  'turia': 'TU',
  'recetas de autores': 'RA',
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

/**
 * Parse Spanish date like "jun 17, 2023" or "mar 19, 2026"
 */
function parseSpanishDate(str) {
  if (!str) return null;
  const clean = str.trim().replace(/"/g, '');
  // Pattern: "mes dd, yyyy"
  const m = clean.match(/^(\w+)\s+(\d+),\s*(\d{4})$/);
  if (!m) return null;
  const monthIdx = MONTH_MAP[m[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const day = parseInt(m[2]);
  const year = parseInt(m[3]);
  const d = new Date(year, monthIdx, day);
  return d.toISOString().split('T')[0];
}

/**
 * Parse CSV with proper handling of quoted fields containing commas.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseEventsCSV(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');

  // Find the header line (contains "Fecha Cierre")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i].includes('Fecha Cierre')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.log('[csvEventParser] Could not find header row');
    return [];
  }

  const headers = parseCSVLine(lines[headerIdx]);
  const colIdx = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const iFechaCierre = colIdx('Fecha Cierre');
  const iNombre = colIdx('Nombre de Trato');
  const iEspacio = colIdx('Espacio Contratado');
  const iSociedad = colIdx('Sociedad Espacio');
  const iTipo = colIdx('Tipo de evento');
  const iFechaEvento = colIdx('Fecha contratada Evento');
  const iPax = colIdx('Pax Contratados');

  console.log(`[csvEventParser] Headers found at line ${headerIdx}. Columns: FechaCierre=${iFechaCierre}, Nombre=${iNombre}, Tipo=${iTipo}, FechaEvento=${iFechaEvento}, Pax=${iPax}, Sociedad=${iSociedad}`);

  const events = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const fechaEvento = parseSpanishDate(fields[iFechaEvento]);
    const fechaCierre = parseSpanishDate(fields[iFechaCierre]);
    const pax = parseInt(fields[iPax]) || 0;
    const tipo = fields[iTipo] || 'Evento';
    const nombre = fields[iNombre] || '';
    const espacio = fields[iEspacio] || '';
    const sociedad = fields[iSociedad] || '';

    if (!fechaEvento) {
      skipped++;
      continue;
    }

    // Normalize tipo — handle "Comunión" → "Comunion" etc.
    let tipoNorm = tipo.trim();
    if (tipoNorm === 'Comunión') tipoNorm = 'Comunion';

    events.push({
      id: events.length + 1,
      nombre: nombre,
      tipo: tipoNorm,
      company: mapCompany(sociedad),
      espacio: espacio,
      sociedadNombre: sociedad,
      fechaCierre: fechaCierre || fechaEvento,
      fechaEvento: fechaEvento,
      paxContratados: pax,
      precioMenu: 0, // Not in CSV — will use hypothesis tickets
      importeAlquiler: 0, // Not in CSV — will use hypothesis
      cobrado: 0,
      observaciones: '',
    });
  }

  console.log(`[csvEventParser] Parsed ${events.length} events (${skipped} skipped for missing date)`);
  return events;
}
