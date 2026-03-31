import express from 'express';
import cors from 'cors';
import { existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseEvents } from './parsers/eventParser.js';
import { parseEventsCSV } from './parsers/csvEventParser.js';
import { parseJournal } from './parsers/journalParser.js';
import { generateSampleEvents, generateSampleJournal } from './sampleData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json());

// Data paths — prioritize local documentos/ folder, then original Mac paths
const DOC_DIR = resolve(ROOT_DIR, 'documentos');
const LEGACY_DATA_DIR = process.env.DATA_DIR || '/Users/kikosg/Desktop/Total/B/01_Financiero/Proyecciones';

// In-memory cache
let eventsCache = null;
const journalCache = {};

// ===== Journal file mapping =====
// Files: Libro_Diario_Año_YYYY_20260331 (N).xlsx
// (1) = PO, (2) = MO, (3) = RA, (no suffix) = TU
const JOURNAL_SUFFIX_MAP = {
  '(1)': 'PO',
  '(2)': 'MO',
  '(3)': 'RA',
};

function findJournalFiles() {
  const files = {};
  const dirs = [DOC_DIR, `${LEGACY_DATA_DIR}/Libro_Diario`];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir);
    for (const fname of entries) {
      if (!fname.endsWith('.xlsx')) continue;
      if (!fname.toLowerCase().includes('libro_diario')) continue;

      const fullPath = resolve(dir, fname);

      // Extract year from filename
      const yearMatch = fname.match(/(\d{4})_\d{8}/);
      if (!yearMatch) continue;
      const year = yearMatch[1];

      // Determine company from filename suffix
      let company = 'TU'; // default (no suffix)
      for (const [suffix, co] of Object.entries(JOURNAL_SUFFIX_MAP)) {
        if (fname.includes(suffix)) {
          company = co;
          break;
        }
      }

      const key = `${company}_${year}`;
      if (!files[key]) {
        files[key] = fullPath;
      }
    }
  }

  return files;
}

function loadEvents() {
  // Try CSV first (in documentos/)
  const csvPath = resolve(DOC_DIR, 'HE - Eventos.csv');
  if (existsSync(csvPath)) {
    console.log(`[server] Loading events from CSV: ${csvPath}`);
    eventsCache = parseEventsCSV(csvPath);
    console.log(`[server] ${eventsCache.length} events loaded from CSV`);
    return;
  }

  // Try XLSX
  const xlsxPath = `${LEGACY_DATA_DIR}/Ventas/HE - Eventos.xlsx`;
  if (existsSync(xlsxPath)) {
    console.log(`[server] Loading events from XLSX: ${xlsxPath}`);
    eventsCache = parseEvents(xlsxPath);
    console.log(`[server] ${eventsCache.length} events loaded from XLSX`);
    return;
  }

  console.log('[server] No event files found, using sample data');
  eventsCache = generateSampleEvents();
  console.log(`[server] ${eventsCache.length} sample events generated`);
}

function loadAllJournals() {
  const fileMap = findJournalFiles();
  console.log(`[server] Found ${Object.keys(fileMap).length} journal files`);

  for (const [key, filePath] of Object.entries(fileMap)) {
    console.log(`[server] Loading journal ${key} from ${filePath}`);
    const result = parseJournal(filePath);
    journalCache[key] = result;
  }

  // Fill in any missing company/year combos with sample data
  for (const co of ['PO', 'TU', 'RA', 'MO']) {
    for (const yr of [2024, 2025]) {
      const key = `${co}_${yr}`;
      if (!journalCache[key]) {
        console.log(`[server] No journal file for ${key}, using sample data`);
        journalCache[key] = generateSampleJournal(co, yr);
      }
    }
  }

  const totalEntries = Object.values(journalCache).reduce((s, j) => s + j.count, 0);
  console.log(`[server] Total journal entries: ${totalEntries}`);
}

// Load initial data
loadEvents();
loadAllJournals();

// ===== Event statistics =====
function logEventStats() {
  if (!eventsCache) return;
  const byType = {};
  const byCompany = {};
  const byYear = {};
  for (const ev of eventsCache) {
    byType[ev.tipo] = (byType[ev.tipo] || 0) + 1;
    byCompany[ev.company] = (byCompany[ev.company] || 0) + 1;
    const yr = ev.fechaEvento?.substring(0, 4);
    if (yr) byYear[yr] = (byYear[yr] || 0) + 1;
  }
  console.log('[server] Events by type:', byType);
  console.log('[server] Events by company:', byCompany);
  console.log('[server] Events by year:', byYear);
}
logEventStats();

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    events: eventsCache?.length || 0,
    journals: Object.keys(journalCache).length,
    journalEntries: Object.values(journalCache).reduce((s, j) => s + j.count, 0),
  });
});

app.get('/api/events', (req, res) => {
  res.json(eventsCache || []);
});

app.get('/api/journal/:company/:year', (req, res) => {
  const { company, year } = req.params;
  const key = `${company}_${year}`;
  res.json(journalCache[key] || { entries: [], count: 0 });
});

app.post('/api/events/reload', (req, res) => {
  loadEvents();
  logEventStats();
  res.json({ ok: true, count: eventsCache.length });
});

app.post('/api/journal/reload', (req, res) => {
  Object.keys(journalCache).forEach(k => delete journalCache[k]);
  loadAllJournals();
  res.json({ ok: true, count: Object.values(journalCache).reduce((s, j) => s + j.count, 0) });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[TesoreríaVision API] Running on port ${PORT}`);
});
