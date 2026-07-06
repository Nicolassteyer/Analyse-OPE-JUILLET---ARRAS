
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DATA_FILE = path.join(UPLOAD_DIR, 'state.json');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { years: { "2025": null, "2026": null } };
  }
}

function saveState(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function stripHtml(input) {
  return String(input || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\uFEFF/g, '')
    .replace(/\r/g, '');
}

function toNumber(v) {
  if (v == null) return 0;
  let s = String(v).trim()
    .replace(/\s/g, '')
    .replace(/[€]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function serviceFromText(text) {
  const m = text.match(/(?:Table closed by:|Time of action|OPE JUILLET ARRAS)[\s\S]*?(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):/i) ||
            text.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):/);
  const hour = m ? parseInt(m[4], 10) : 12;
  return hour < 15 ? 'midi' : 'soir';
}

function dateFromText(text) {
  const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function parseFlams(html, year) {
  const plain = stripHtml(html);
  const parts = plain.split(/(?=Table:\s*\d+)/g).filter(p => /Table:\s*\d+/.test(p));
  const opRegex = /OPE\s+JUILLET\s+ARRAS/i;

  const result = {
    year,
    operation: 'OPE JUILLET ARRAS',
    importedAt: new Date().toISOString(),
    period: dateFromText(plain),
    discountsCount: 0,
    discountAmount: 0,
    caConcerned: 0,
    clientsConcerned: 0,
    ticketsConcerned: 0,
    avgBasket: 0,
    avgCAClient: 0,
    avgDiscount: 0,
    estimatedDiscountRate: 0,
    services: {
      midi: { clients: 0, tickets: 0, discountsCount: 0, discountAmount: 0, caConcerned: 0 },
      soir: { clients: 0, tickets: 0, discountsCount: 0, discountAmount: 0, caConcerned: 0 }
    },
    tickets: []
  };

  for (const ticket of parts) {
    if (!opRegex.test(ticket)) continue;

    const table = (ticket.match(/Table:\s*([0-9]+)/) || [,''])[1];
    const note = (ticket.match(/Note number:\s*([0-9]+)/) || [,''])[1];
    const covers = parseInt((ticket.match(/Number of covers:\s*(-?\d+)/i) || [,0])[1], 10) || 0;
    const pay = toNumber((ticket.match(/TOTAL TO PAY:\s*([\-0-9\s.,]+)/i) || [,0])[1]);
    const subtotal = toNumber((ticket.match(/SOUS-TOTAL:\s*([\-0-9\s.,]+)/i) || [,0])[1]);
    const totalRemiseBlock = toNumber((ticket.match(/Total remise:\s*([\-0-9\s.,]+)/i) || [,0])[1]);
    const svc = serviceFromText(ticket);

    let lineQty = 0;
    let lineDiscount = 0;
    const lines = ticket.split('\n').filter(l => opRegex.test(l));
    for (const line of lines) {
      // ex: 1    FORMULE ELSASSICH        14,30  OPE JUILLET ARRAS
      const beforeOp = line.split(/OPE\s+JUILLET\s+ARRAS/i)[0] || '';
      const qtyMatch = beforeOp.match(/^\s*(-?\d+(?:[,.]\d+)?)/);
      const nums = beforeOp.match(/-?\d+(?:[,.]\d+)?/g) || [];
      const qty = qtyMatch ? toNumber(qtyMatch[1]) : 1;
      const amount = nums.length ? toNumber(nums[nums.length - 1]) : 0;
      lineQty += qty;
      lineDiscount += amount;
    }

    const discountCount = lineQty || 0;
    const discountAmount = lineDiscount || totalRemiseBlock || 0;
    const ca = pay > 0 ? pay + discountAmount : (subtotal > 0 ? subtotal : pay);

    result.discountsCount += discountCount;
    result.discountAmount += discountAmount;
    result.caConcerned += ca;
    result.clientsConcerned += covers;
    result.ticketsConcerned += 1;

    result.services[svc].clients += covers;
    result.services[svc].tickets += 1;
    result.services[svc].discountsCount += discountCount;
    result.services[svc].discountAmount += discountAmount;
    result.services[svc].caConcerned += ca;

    result.tickets.push({
      table, note, service: svc, clients: covers,
      discountsCount: discountCount,
      discountAmount: money(discountAmount),
      caConcerned: money(ca)
    });
  }

  result.discountsCount = Math.round(result.discountsCount);
  result.discountAmount = money(result.discountAmount);
  result.caConcerned = money(result.caConcerned);
  result.avgBasket = result.ticketsConcerned ? money(result.caConcerned / result.ticketsConcerned) : 0;
  result.avgCAClient = result.clientsConcerned ? money(result.caConcerned / result.clientsConcerned) : 0;
  result.avgDiscount = result.discountsCount ? money(result.discountAmount / result.discountsCount) : 0;
  result.estimatedDiscountRate = (result.caConcerned + result.discountAmount) ? Math.round((result.discountAmount / (result.caConcerned + result.discountAmount)) * 10000) / 100 : 0;
  for (const key of ['midi','soir']) {
    result.services[key].discountsCount = Math.round(result.services[key].discountsCount);
    result.services[key].discountAmount = money(result.services[key].discountAmount);
    result.services[key].caConcerned = money(result.services[key].caConcerned);
  }
  return result;
}

function rebuildState() {
  const state = loadState();
  state.years = state.years || {};
  for (const y of ['2025','2026']) {
    const file = path.join(UPLOAD_DIR, `${y}.html`);
    if (fs.existsSync(file)) {
      const html = safeRead(file);
      state.years[y] = parseFlams(html, y);
      state.years[y].filename = state.years[y].filename || `${y}.html`;
    } else {
      state.years[y] = null;
    }
  }
  saveState(state);
  return state;
}

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, `http://x`).pathname);
  if (pathname === '/' || pathname === '/dashboard') pathname = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  const ext = path.extname(file).toLowerCase();
  const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml'};
  send(res, 200, fs.readFileSync(file), types[ext] || 'application/octet-stream');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/data') {
    return send(res, 200, JSON.stringify(rebuildState()));
  }

  if (req.method === 'GET' && url.pathname.startsWith('/saved/')) {
    const year = url.pathname.includes('2025') ? '2025' : '2026';
    const file = path.join(UPLOAD_DIR, `${year}.html`);
    if (!fs.existsSync(file)) return send(res, 404, 'Aucun HTML sauvegardé', 'text/plain');
    return send(res, 200, fs.readFileSync(file), 'text/html; charset=utf-8');
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/upload/')) {
    const year = url.pathname.split('/').pop();
    if (!['2025','2026'].includes(year)) return send(res, 400, JSON.stringify({error:'Année invalide'}));
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 30 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload.content) throw new Error('Fichier vide');
        fs.writeFileSync(path.join(UPLOAD_DIR, `${year}.html`), payload.content, 'utf8');
        const state = rebuildState();
        if (state.years[year]) state.years[year].filename = payload.filename || `${year}.html`;
        saveState(state);
        send(res, 200, JSON.stringify({ ok:true, data: state.years[year], state }));
      } catch (e) {
        send(res, 500, JSON.stringify({ error: e.message || 'Erreur upload' }));
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`FLAMS Dashboard lancé sur le port ${PORT}`);
});
