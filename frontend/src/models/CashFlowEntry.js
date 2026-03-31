let _id = 0;

export class CashFlowEntry {
  constructor({ date, amount, type, subtype, company, eventId, eventNombre, eventTipo, paxEfectivos, source, subcuenta, description }) {
    this.id = ++_id;
    this.date = date; // 'YYYY-MM-DD'
    this.amount = amount || 0;
    this.baseImponible = Math.round(this.amount / 1.21);
    this.ivaAmount = this.amount - this.baseImponible;
    this.type = type; // 'INCOME' | 'COST'
    this.subtype = subtype || '';
    this.company = company || '';
    this.eventId = eventId || null;
    this.eventNombre = eventNombre || '';
    this.eventTipo = eventTipo || '';
    this.paxEfectivos = paxEfectivos || 0;
    this.source = source || 'PROJECTED'; // 'PROJECTED' | 'ACTUAL'
    this.subcuenta = subcuenta || '';
    this.description = description || '';
  }
}

export function resetIdCounter() { _id = 0; }
