
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const OPERATION = 'OPE JUILLET ARRAS';

fs.mkdirSync(DATA_DIR, { recursive: true });

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|tr|table|pre|span|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\r/g, '');
}

function parseMoney(value) {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/[^\d,.\-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(v) {
  const n = parseInt(String(v || '').replace(/[^\d\-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function classifyService(hour) {
  if (hour == null) return 'inconnu';
  return hour < 16 ? 'midi' : 'soir';
}

function parseReport(html, year) {
  const text = stripHtml(html);
  const normalized = text.replace(/\u00A0/g, ' ');
  const chunks = normalized.split(/(?=Table\s*:?\s*\d+)/i).filter(Boolean);

  const tickets = [];
  let totalDiscountQty = 0;
  let totalDiscountAmount = 0;
  let caConcerned = 0;
  let coversConcerned = 0;
  let period = null;
  let minDate = null;
  let maxDate = null;

  for (const chunk of chunks) {
    if (!chunk.toUpperCase().includes(OPERATION)) continue;

    const tableMatch = chunk.match(/Table\s*:?\s*(\d+)/i);
    const noteMatch = chunk.match(/Note number\s*:?\s*(\d+)/i);
    const coversMatch = chunk.match(/Number of covers\s*:?\s*(-?\d+)/i);
    const covers = coversMatch ? Math.max(0, parseIntSafe(coversMatch[1])) : 0;

    // Discount total displayed by FLAMS inside the ticket.
    const totalRemiseMatch = chunk.match(/Total remise\s*:?\s*([\-]?\d[\d\s.,]*)/i);
    const ticketDiscountTotal = totalRemiseMatch ? Math.abs(parseMoney(totalRemiseMatch[1])) : 0;

    const totalPayMatch = chunk.match(/TOTAL TO PAY\s*:?\s*([\-]?\d[\d\s.,]*)/i);
    const ticketPay = totalPayMatch ? Math.max(0, parseMoney(totalPayMatch[1])) : 0;

    let qty = 0;
    let lineAmount = 0;
    let discountDates = [];

    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.toUpperCase().includes(OPERATION)) continue;
      // Expected: 1 FORMULE ... 14,30 OPE JUILLET ARRAS 01.07.2026 12:...
      const beforeReason = line.split(OPERATION)[0].trim();
      const qtyMatch = beforeReason.match(/^(-?\d+)/);
      if (qtyMatch) qty += parseIntSafe(qtyMatch[1]);

      const amountMatch = beforeReason.match(/(-?\d+(?:[.,]\d{2}))\s*$/);
      if (amountMatch) lineAmount += Math.abs(parseMoney(amountMatch[1]));

      const dateMatch = line.match(/(\d{2}[./-]\d{2}[./-]\d{4})\s+(\d{1,2})\s*:/);
      if (dateMatch) {
        const d = dateMatch[1].replaceAll('.', '-').replaceAll('/', '-');
        const hour = parseIntSafe(dateMatch[2]);
        discountDates.push({ date: d, hour, service: classifyService(hour) });
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }

    if (qty === 0) qty = 1;
    const discountAmount = ticketDiscountTotal || lineAmount;
    const caBeforeDiscount = ticketPay + discountAmount;
    const mainDate = discountDates[0] || { date: null, hour: null, service: 'inconnu' };

    totalDiscountQty += qty;
    totalDiscountAmount += discountAmount;
    caConcerned += caBeforeDiscount;
    coversConcerned += covers;

    tickets.push({
      table: tableMatch ? tableMatch[1] : '',
      note: noteMatch ? noteMatch[1] : '',
      covers,
      qty,
      discountAmount,
      totalPaid: ticketPay,
      caBeforeDiscount,
      date: mainDate.date,
      hour: mainDate.hour,
      service: mainDate.service
    });
  }

  if (minDate && maxDate) period = minDate === maxDate ? minDate : `${minDate} → ${maxDate}`;

  const serviceStats = {
    midi: { tickets: 0, clients: 0, remises: 0, montantRemise: 0, ca: 0 },
    soir: { tickets: 0, clients: 0, remises: 0, montantRemise: 0, ca: 0 },
    inconnu: { tickets: 0, clients: 0, remises: 0, montantRemise: 0, ca: 0 }
  };

  for (const t of tickets) {
    const s = serviceStats[t.service] || serviceStats.inconnu;
    s.tickets += 1;
    s.clients += t.covers;
    s.remises += t.qty;
    s.montantRemise += t.discountAmount;
    s.ca += t.caBeforeDiscount;
  }

  return {
    year,
    operation: OPERATION,
    importedAt: new Date().toISOString(),
    period,
    kpis: {
      nombreRemises: totalDiscountQty,
      montantRemise: round2(totalDiscountAmount),
      caConcerne: round2(caConcerned),
      clientsConcernes: coversConcerned,
      ticketsConcernes: tickets.length,
      panierMoyen: tickets.length ? round2(caConcerned / tickets.length) : 0,
      caMoyenClient: coversConcerned ? round2(caConcerned / coversConcerned) : 0,
      remiseMoyenne: totalDiscountQty ? round2(totalDiscountAmount / totalDiscountQty) : 0,
      tauxRemise: caConcerned ? round2((totalDiscountAmount / caConcerned) * 100) : 0
    },
    services: mapRound(serviceStats),
    tickets
  };
}

function round2(n){ return Math.round((Number(n)||0)*100)/100; }
function mapRound(obj){
  for (const k of Object.keys(obj)) {
    for (const p of Object.keys(obj[k])) obj[k][p] = round2(obj[k][p]);
  }
  return obj;
}

function loadYear(year) {
  const parsedPath = path.join(DATA_DIR, `report-${year}.json`);
  if (!fs.existsSync(parsedPath)) return null;
  try { return JSON.parse(fs.readFileSync(parsedPath, 'utf8')); } catch { return null; }
}

function comparison(a, b) {
  function diff(v2026, v2025) {
    const ecart = round2((v2026 || 0) - (v2025 || 0));
    const pct = v2025 ? round2((ecart / v2025) * 100) : null;
    return { v2026: v2026 || 0, v2025: v2025 || 0, ecart, pct };
  }
  const y26 = a || { kpis:{}, services:{midi:{},soir:{}} };
  const y25 = b || { kpis:{}, services:{midi:{},soir:{}} };
  return {
    clientsTotal: diff(y26.kpis.clientsConcernes, y25.kpis.clientsConcernes),
    clientsMidi: diff(y26.services?.midi?.clients, y25.services?.midi?.clients),
    clientsSoir: diff(y26.services?.soir?.clients, y25.services?.soir?.clients),
    caTotal: diff(y26.kpis.caConcerne, y25.kpis.caConcerne),
    remises: diff(y26.kpis.nombreRemises, y25.kpis.nombreRemises),
    montantRemise: diff(y26.kpis.montantRemise, y25.kpis.montantRemise)
  };
}

function send(res, status, data, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.includes('json') ? JSON.stringify(data) : data);
}

function parseMultipart(req, cb) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) return cb(new Error('Formulaire invalide'));
  const boundary = '--' + boundaryMatch[1];

  const chunks = [];
  req.on('data', d => chunks.push(d));
  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const raw = buffer.toString('binary');
    const parts = raw.split(boundary);
    for (const part of parts) {
      if (!part.includes('Content-Disposition') || !part.includes('filename=')) continue;
      const splitIndex = part.indexOf('\r\n\r\n');
      if (splitIndex === -1) continue;
      let content = part.slice(splitIndex + 4);
      content = content.replace(/\r\n--$/, '');
      return cb(null, Buffer.from(content, 'binary').toString('utf8'));
    }
    cb(new Error('Aucun fichier reçu'));
  });
  req.on('error', cb);
}

function serveStatic(req, res) {
  let filePath = req.url.split('?')[0];
  if (filePath === '/' || filePath === '/dashboard') filePath = '/index.html';
  const safe = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const full = path.join(PUBLIC_DIR, safe);
  if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  const ext = path.extname(full);
  const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8' };
  send(res, 200, fs.readFileSync(full), types[ext] || 'application/octet-stream');
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/api/dashboard') {
    const y2026 = loadYear('2026');
    const y2025 = loadYear('2025');
    return send(res, 200, { y2026, y2025, comparison: comparison(y2026, y2025) });
  }

  if (req.method === 'POST' && /^\/api\/upload\/(2025|2026)$/.test(url)) {
    const year = url.match(/(2025|2026)$/)[1];
    return parseMultipart(req, (err, html) => {
      if (err) return send(res, 400, { error: err.message });
      const parsed = parseReport(html, year);
      fs.writeFileSync(path.join(DATA_DIR, `report-${year}.html`), html, 'utf8');
      fs.writeFileSync(path.join(DATA_DIR, `report-${year}.json`), JSON.stringify(parsed, null, 2), 'utf8');
      return send(res, 200, { ok: true, report: parsed });
    });
  }

  if (req.method === 'GET' && /^\/saved\/(2025|2026)$/.test(url)) {
    const year = url.match(/(2025|2026)$/)[1];
    const file = path.join(DATA_DIR, `report-${year}.html`);
    if (!fs.existsSync(file)) return send(res, 404, 'Aucun HTML sauvegardé', 'text/plain; charset=utf-8');
    return send(res, 200, fs.readFileSync(file, 'utf8'), 'text/html; charset=utf-8');
  }

  serveStatic(req, res);
});

server.listen(PORT, () => console.log(`Flams Dashboard Pro running on port ${PORT}`));
