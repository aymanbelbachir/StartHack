export interface InvoiceLineItem {
  description: string;
  nights?: number;
  unitPrice?: number;
  total: number;
}

export interface InvoicePayment {
  method: string;
  deposit: number;
  balanceDue: number;
  chargeDate: string;
  reference: string;
}

export interface ParsedInvoice {
  hotel: string;
  address: string;
  vatNumber: string;
  refNumber: string;
  guest: string;
  email: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  room: string;
  guests: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vat: number;
  total: number;
  payment: InvoicePayment;
  cancellationDeadline: string;
  cancellationFee: number;
}

function parseChf(str: string): number {
  return parseFloat(str.replace(/CHF\s*/g, '').replace(/'/g, '').replace(',', '.').trim()) || 0;
}

export function parseInvoice(markdown: string): ParsedInvoice {
  const lines = markdown.split('\n').map(l => l.trim());

  const get = (pattern: RegExp) => {
    for (const line of lines) {
      const m = line.match(pattern);
      if (m) return m[1]?.trim() ?? '';
    }
    return '';
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const hotel = lines.find(l => l.startsWith('# '))?.replace(/^#\s*/, '') ?? '';
  const address = lines.find(l => l.includes('Höheweg') || l.includes('Hauptstrasse') || l.includes('höheweg'))
    ?.replace(/\*\*/g, '').trim() ?? '';
  const vatNumber = get(/CHE-[\d.]+/);

  // ── Booking info ──────────────────────────────────────────────────────────
  const refNumber = get(/Ref\.\s*No[:\s]+([A-Z0-9-]+)/i);
  const guest = get(/\*\*Guest\*\*\s*\|\s*(?:Mr\.|Mrs\.|Ms\.)?\s*([^|]+)/);
  const email = get(/\*\*Email\*\*\s*\|\s*(\S+@\S+)/);
  const checkIn = get(/\*\*Check-in\*\*\s*\|\s*([^|]+)/);
  const checkOut = get(/\*\*Check-out\*\*\s*\|\s*([^|]+)/);
  const nightsStr = get(/\*\*Duration\*\*\s*\|\s*(\d+)/);
  const nights = parseInt(nightsStr) || 0;
  const room = get(/\*\*Room\*\*\s*\|\s*([^|]+)/);
  const guestsStr = get(/\*\*Guests\*\*\s*\|\s*(\d+)/);
  const guestsCount = parseInt(guestsStr) || 1;

  // ── Line items ────────────────────────────────────────────────────────────
  const lineItems: InvoiceLineItem[] = [];
  let inBookingTable = false;

  for (const line of lines) {
    if (line.includes('BOOKING DETAILS')) { inBookingTable = true; continue; }
    if (line.includes('TOTAL') && inBookingTable) { inBookingTable = false; continue; }
    if (!inBookingTable) continue;
    if (!line.startsWith('|') || line.includes('Description') || line.match(/^\|[-\s|]+$/)) continue;

    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;

    const description = cols[0];
    // em-dash variants (—, –, -, â€", or plain "-") mean no per-night count
    const nightsVal = /^[—–\-â€"]$/.test(cols[1]) ? undefined : parseInt(cols[1]) || undefined;
    const unitPrice = /^[—–\-â€"]$/.test(cols[2]) ? undefined : parseChf(cols[2]);
    const total = parseChf(cols[3] ?? cols[2]);

    if (description && total > 0) {
      lineItems.push({ description, nights: nightsVal, unitPrice, total });
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = parseChf(get(/Subtotal excl\. VAT\s*\|\s*(CHF[\s\d'.]+)/));
  const vat = parseChf(get(/VAT[\s\d.%]+\s*\|\s*(CHF[\s\d'.]+)/));
  const total = parseChf(get(/\*\*Total incl\. VAT\*\*\s*\|\s*\*\*(CHF[\s\d'.]+)\*\*/));

  // ── Payment ───────────────────────────────────────────────────────────────
  const method = get(/\*\*Method\*\*\s*\|\s*([^|]+)/);
  const deposit = parseChf(get(/\*\*Deposit charged\*\*\s*\|\s*(CHF[\s\d'.]+)/));
  const balanceDue = parseChf(get(/\*\*Balance due at arrival\*\*\s*\|\s*(CHF[\s\d'.]+)/));
  const chargeDate = get(/\*\*Charge date\*\*\s*\|\s*([^|]+)/);
  const reference = get(/\*\*Reference\*\*\s*\|\s*([^|]+)/);

  // ── Cancellation ──────────────────────────────────────────────────────────
  const cancellationDeadline = get(/Free cancellation until \*\*(.+?)\*\*/);
  const cancellationFeeStr = get(/cancellation fee of \*\*1 night\*\* \(CHF ([\d'.]+)\)/);
  const cancellationFee = parseFloat(cancellationFeeStr.replace(/'/g, '')) || 0;

  return {
    hotel,
    address,
    vatNumber,
    refNumber,
    guest,
    email,
    checkIn,
    checkOut,
    nights,
    room,
    guests: guestsCount,
    lineItems,
    subtotal,
    vat,
    total,
    payment: { method, deposit, balanceDue, chargeDate, reference },
    cancellationDeadline,
    cancellationFee,
  };
}

/** Parse "Sunday, 20 April 2026" → Date (midnight UTC) */
export function parseInvoiceDate(str: string): Date | null {
  const m = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Returns true if today falls within [checkIn, checkOut] (inclusive) */
export function isStayActive(checkIn: string, checkOut: string): boolean {
  const cin = parseInvoiceDate(checkIn);
  const cout = parseInvoiceDate(checkOut);
  if (!cin || !cout) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  cout.setHours(23, 59, 59, 999);
  return today >= cin && today <= cout;
}
