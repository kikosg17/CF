export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  return d.toISOString().split('T')[0];
}

export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function subDays(d, n) { return addDays(d, -n); }

export function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

export function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function startOfWeek(d) {
  const r = new Date(d);
  const day = r.getDay() || 7;
  r.setDate(r.getDate() - day + 1);
  return r;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}

export function endOfYear(d) {
  return new Date(d.getFullYear(), 11, 31);
}

export function isSameDay(a, b) {
  return toDateStr(a) === toDateStr(b);
}

export function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function ivaSettlementDates(year) {
  return [
    new Date(year, 0, 20),  // Jan 20
    new Date(year, 3, 20),  // Apr 20
    new Date(year, 6, 20),  // Jul 20
    new Date(year, 9, 20),  // Oct 20
  ];
}

export function getPeriodRange(view, refDate) {
  const d = refDate || today();
  switch (view) {
    case 'week':
      return { start: startOfWeek(d), end: addDays(startOfWeek(d), 6) };
    case 'month':
      return { start: startOfMonth(d), end: endOfMonth(d) };
    case 'quarter': {
      const qm = Math.floor(d.getMonth() / 3) * 3;
      return { start: new Date(d.getFullYear(), qm, 1), end: new Date(d.getFullYear(), qm + 3, 0) };
    }
    case 'year':
      return { start: startOfYear(d), end: endOfYear(d) };
    default: // day
      return { start: d, end: d };
  }
}

export function eachDay(start, end) {
  const days = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function eachMonth(start, end) {
  const months = [];
  let cur = startOfMonth(start);
  while (cur <= end) {
    months.push(new Date(cur));
    cur = addMonths(cur, 1);
  }
  return months;
}
