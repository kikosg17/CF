import { readFileSync, existsSync } from 'fs';
import { read, utils } from 'xlsx';

const COMPANY_MAP = {
  'portaceli': 'PO',
  'turia': 'TU',
  'recetas': 'RA',
  'moier': 'MO',
};

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

function detectCompany(rows) {
  // Company name is in row 2 (index 2), column 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const cell = String(rows[i]?.[0] || '').toLowerCase();
    for (const [key, code] of Object.entries(COMPANY_MAP)) {
      if (cell.includes(key)) return code;
    }
  }
  return null;
}

function detectYear(rows) {
  // Ejercicio info is in row 2, column ~9-10
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    for (let j = 0; j < (rows[i]?.length || 0); j++) {
      const cell = String(rows[i][j] || '');
      const m = cell.match(/(\d{4})/);
      if (m && Number(m[1]) >= 2020 && Number(m[1]) <= 2030) return Number(m[1]);
    }
  }
  return null;
}

export function parseJournal(filePath) {
  if (!existsSync(filePath)) {
    console.log(`[journalParser] File not found: ${filePath}`);
    return { entries: [], count: 0, company: null, year: null };
  }

  const buf = readFileSync(filePath);
  const wb = read(buf, { cellDates: false }); // Keep serial dates for precise parsing
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

  const company = detectCompany(rows);
  const year = detectYear(rows);

  // Find header row — look for "Fecha" in first column
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell === 'fecha') {
      headerIdx = i;
      break;
    }
    // Also check all cells
    for (let j = 0; j < Math.min(row.length, 5); j++) {
      if (String(row[j] || '').toLowerCase().trim() === 'fecha') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx !== -1) break;
  }

  if (headerIdx === -1) {
    console.log(`[journalParser] Could not find header row in ${filePath}`);
    return { entries: [], count: 0, company, year };
  }

  // Map column positions from the real structure:
  // Col 0: Fecha, Col 1: Asiento, Col 2: Apunte, Col 3: Subcuenta,
  // Col 4: Descripcion, Col 7: Concepto, Col 9: Debe, Col 10: Haber
  const headerRow = rows[headerIdx];
  const headers = headerRow.map(c => String(c).toLowerCase().trim());

  const findCol = (name) => headers.findIndex(h => h === name || h.includes(name));

  const iFecha = findCol('fecha');
  const iAsiento = findCol('asiento');
  const iSubcuenta = findCol('subcuenta');
  const iDescripcion = findCol('descripcion') !== -1 ? findCol('descripcion') : findCol('descripción');
  const iConcepto = findCol('concepto');
  const iDebe = findCol('debe');
  const iHaber = findCol('haber');

  console.log(`[journalParser] ${filePath}: company=${company}, year=${year}, headerRow=${headerIdx}, cols: Fecha=${iFecha} Asiento=${iAsiento} Subcuenta=${iSubcuenta} Desc=${iDescripcion} Concepto=${iConcepto} Debe=${iDebe} Haber=${iHaber}`);

  const entries = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;

    const rawFecha = r[iFecha >= 0 ? iFecha : 0];
    const fecha = parseSerialDate(rawFecha);
    if (!fecha) continue;

    const debe = Number(r[iDebe >= 0 ? iDebe : 9]) || 0;
    const haber = Number(r[iHaber >= 0 ? iHaber : 10]) || 0;
    if (debe === 0 && haber === 0) continue;

    entries.push({
      fecha: formatDate(fecha),
      asiento: String(r[iAsiento >= 0 ? iAsiento : 1] || ''),
      subcuenta: String(r[iSubcuenta >= 0 ? iSubcuenta : 3] || ''),
      descripcion: String(r[iDescripcion >= 0 ? iDescripcion : 4] || ''),
      concepto: String(r[iConcepto >= 0 ? iConcepto : 7] || ''),
      debe,
      haber,
    });
  }

  console.log(`[journalParser] ${company || '??'}/${year || '??'}: ${entries.length} entries parsed`);
  return { entries, count: entries.length, company, year };
}
