import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { parseEvents } from './parsers/eventParser.js';
import { parseJournal } from './parsers/journalParser.js';
import { generateSampleEvents, generateSampleJournal } from './sampleData.js';

const app = express();
app.use(cors());
app.use(express.json());

// Configure data paths — adjust these to your actual file locations
const DATA_DIR = process.env.DATA_DIR || '/Users/kikosg/Desktop/Total/B/01_Financiero/Proyecciones';
const EVENTS_FILE = `${DATA_DIR}/Ventas/HE - Eventos.xlsx`;
const JOURNAL_DIR = `${DATA_DIR}/Libro_Diario`;

// In-memory cache
let eventsCache = null;
const journalCache = {};

function loadEvents() {
  if (existsSync(EVENTS_FILE)) {
    console.log(`[server] Loading events from ${EVENTS_FILE}`);
    eventsCache = parseEvents(EVENTS_FILE);
  } else {
    console.log('[server] Excel files not found, using sample data');
    eventsCache = generateSampleEvents();
  }
  console.log(`[server] ${eventsCache.length} events loaded`);
}

function loadJournal(company, year) {
  const key = `${company}_${year}`;
  const patterns = [
    `${JOURNAL_DIR}/${company}_${year}.xlsx`,
    `${JOURNAL_DIR}/Libro_Diario_${company}_${year}.xlsx`,
    `${JOURNAL_DIR}/${year}_${company}.xlsx`,
  ];

  const found = patterns.find(p => existsSync(p));
  if (found) {
    console.log(`[server] Loading journal from ${found}`);
    journalCache[key] = parseJournal(found);
  } else {
    console.log(`[server] Journal file not found for ${company}/${year}, using sample data`);
    journalCache[key] = generateSampleJournal(company, year);
  }
  console.log(`[server] ${journalCache[key].count} journal entries for ${key}`);
}

// Load initial data
loadEvents();
for (const co of ['PO', 'TU', 'RA', 'MO']) {
  for (const yr of [2024, 2025]) {
    loadJournal(co, yr);
  }
}

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    events: eventsCache?.length || 0,
    journals: Object.keys(journalCache).length,
  });
});

app.get('/api/events', (req, res) => {
  res.json(eventsCache || []);
});

app.get('/api/journal/:company/:year', (req, res) => {
  const { company, year } = req.params;
  const key = `${company}_${year}`;
  if (!journalCache[key]) {
    loadJournal(company, Number(year));
  }
  res.json(journalCache[key] || { entries: [], count: 0 });
});

app.post('/api/events/reload', (req, res) => {
  loadEvents();
  res.json({ ok: true, count: eventsCache.length });
});

app.post('/api/journal/reload', (req, res) => {
  Object.keys(journalCache).forEach(k => delete journalCache[k]);
  for (const co of ['PO', 'TU', 'RA', 'MO']) {
    for (const yr of [2024, 2025]) {
      loadJournal(co, yr);
    }
  }
  res.json({ ok: true, count: Object.values(journalCache).reduce((s, j) => s + j.count, 0) });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[TesoreríaVision API] Running on port ${PORT}`);
});
