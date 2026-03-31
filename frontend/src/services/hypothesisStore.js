import { DEFAULTS, cloneDefaults } from '../config/defaults.js';

const STORAGE_KEY = 'tesoreria_hypotheses';

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadHypotheses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return deepMerge(cloneDefaults(), parsed);
    }
  } catch (e) {
    console.warn('Error loading hypotheses:', e);
  }
  return cloneDefaults();
}

export function saveHypotheses(hyp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hyp));
  } catch (e) {
    console.warn('Error saving hypotheses:', e);
  }
}

export function resetHypotheses() {
  localStorage.removeItem(STORAGE_KEY);
  return cloneDefaults();
}

export function exportHypotheses(hyp) {
  const blob = new Blob([JSON.stringify(hyp, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hipotesis_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importHypotheses(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const merged = deepMerge(cloneDefaults(), data);
        saveHypotheses(merged);
        resolve(merged);
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
