import { readFileSync, existsSync } from 'fs';
import { read, utils } from 'xlsx';

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

export function parseJournal(filePath) {
  if (!existsSync(filePath)) {
    console.log(`[journalParser] File not found: ${filePath}`);
    return { entries: [], count: 0 };
  }

  const buf = readFileSync(filePath);
  const wb = read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row by searching for "fecha"
  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => String(c).toLowerCase().trim());
    if (row.some(c => c === 'fecha')) {
      headerIdx = i;
      headers = row;
      break;
    }
  }

  if (headerIdx === -1) {
    console.log('[journalParser] Could not find header row');
    return { entries: [], count: 0 };
  }

  const col = (name) => headers.findIndex(h => h.includes(name));
  const iFecha = col('fecha');
  const iAsiento = col('asiento');
  const iSubcuenta = col('subcuenta') !== -1 ? col('subcuenta') : col('cuenta');
  const iContra = col('contrapartida');
  const iDebe = col('debe');
  const iHaber = col('haber');
  const iConcepto = col('concepto') !== -1 ? col('concepto') : col('descripcion');

  const entries = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3) continue;

    const fecha = parseSerialDate(r[iFecha >= 0 ? iFecha : 0]);
    if (!fecha) continue;

    entries.push({
      fecha: formatDate(fecha),
      asiento: String(r[iAsiento >= 0 ? iAsiento : 1] || ''),
      subcuenta: String(r[iSubcuenta >= 0 ? iSubcuenta : 2] || ''),
      contrapartida: iContra >= 0 ? String(r[iContra] || '') : '',
      debe: Number(r[iDebe >= 0 ? iDebe : 3]) || 0,
      haber: Number(r[iHaber >= 0 ? iHaber : 4]) || 0,
      concepto: String(r[iConcepto >= 0 ? iConcepto : 5] || ''),
    });
  }

  return { entries, count: entries.length };
}
