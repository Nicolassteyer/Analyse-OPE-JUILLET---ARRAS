const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const files = {
  '2025': path.join(DATA_DIR, 'report-2025.html'),
  '2026': path.join(DATA_DIR, 'report-2026.html'),
};

function send(res, status, data, type='application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}
function sendJson(res, status, obj) { send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8'); }

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '/dashboard') urlPath = '/index.html';
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not Found', 'text/plain');
    const ext = path.extname(filePath).toLowerCase();
    const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
    send(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

function parseNumberFR(input) {
  if (!input) return 0;
  const s = String(input).replace(/\u00a0/g,' ').replace(/[^\d,.\-]/g,'').trim();
  if (!s) return 0;
  const hasComma = s.includes(',');
  let n = hasComma ? Number(s.replace(/\./g,'').replace(',', '.')) : Number(s.replace(/,/g,''));
  return Number.isFinite(n) ? n : 0;
}
function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/\s+/g,' ')
    .trim();
}
function splitTickets(html) {
  const parts = html.split(/(?=Table\s*:|Ticket\s*n|Addition\s*n|Facture\s*n)/i);
  return parts.length > 1 ? parts : [html];
}
function serviceFromText(text) {
  const matches = [...text.matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/g)];
  let hour = null;
  if (matches.length) hour = Number(matches[0][1]);
  if (hour === null) return 'non_detecte';
  return hour < 16 ? 'midi' : 'soir';
}
function detectClients(text) {
  const patterns = [
    /(?:couverts?|clients?)\D{0,20}(\d{1,4})/i,
    /(\d{1,4})\D{0,10}(?:couverts?|clients?)/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return Number(m[1]) || 0;
  }
  return 0;
}
function parseReport(html) {
  const plain = stripTags(html);
  const dateMatch = plain.match(/\b([0-3]?\d[\/.-][01]?\d[\/.-](?:20)?\d{2})\b/);
  const tickets = splitTickets(html);
  let remises = 0, montantRemise = 0, ca = 0, clients = 0, ticketsConcernes = 0;
  const services = { midi: {clients:0,tickets:0,ca:0,remises:0}, soir:{clients:0,tickets:0,ca:0,remises:0}, non_detecte:{clients:0,tickets:0,ca:0,remises:0} };
  const ticketRows = [];
  for (const raw of tickets) {
    const text = stripTags(raw);
    if (!/OPE\s+JUILLET\s+ARRAS/i.test(text)) continue;
    ticketsConcernes++;
    const service = serviceFromText(text);
    let ticketClients = detectClients(text);
    // Detect TTC / total ticket.
    let ticketCA = 0;
    const caPatterns = [
      /(?:Total\s*TTC|TTC|Total\s+ticket|A\s*payer|À\s*payer)\D{0,40}(-?[\d\s.,]+)\s*€/i,
      /(-?[\d\s.,]+)\s*€\D{0,20}(?:Total\s*TTC|TTC)/i
    ];
    for (const p of caPatterns) {
      const m = text.match(p);
      if (m) { ticketCA = Math.abs(parseNumberFR(m[1])); break; }
    }
    // Discount qty + amount around operation name.
    const opeLines = text.split(/(?=OPE\s+JUILLET\s+ARRAS)|(?<=ARRAS)/i).filter(x=>/OPE\s+JUILLET\s+ARRAS/i.test(x));
    let ticketRemises = 0, ticketMontantRemise = 0;
    const arounds = text.match(/(?:-?\d+)?\s*OPE\s+JUILLET\s+ARRAS[\s\S]{0,120}?-?[\d\s.,]+\s*€/gi) || [];
    for (const a of arounds) {
      const qtyMatch = a.match(/(?:^|\s)(-?\d{1,4})\s+OPE/i);
      let qty = qtyMatch ? Math.abs(Number(qtyMatch[1])) : 1;
      const amounts = [...a.matchAll(/(-?[\d\s.,]+)\s*€/g)].map(m=>parseNumberFR(m[1])).filter(n=>n!==0);
      const amount = amounts.length ? Math.abs(amounts[amounts.length-1]) : 0;
      ticketRemises += qty;
      ticketMontantRemise += amount;
    }
    if (ticketRemises === 0) {
      // Fallback: count operation occurrences.
      ticketRemises = (text.match(/OPE\s+JUILLET\s+ARRAS/gi)||[]).length;
    }
    // If global total remise appears in ticket, avoid impossible huge values
    if (ticketMontantRemise > 1000000) ticketMontantRemise = 0;
    remises += ticketRemises;
    montantRemise += ticketMontantRemise;
    ca += ticketCA;
    clients += ticketClients;
    services[service].clients += ticketClients;
    services[service].tickets += 1;
    services[service].ca += ticketCA;
    services[service].remises += ticketRemises;
    ticketRows.push({ service, clients: ticketClients, ca: ticketCA, remises: ticketRemises });
  }
  return {
    date: dateMatch ? dateMatch[1] : null,
    remises, montantRemise, ca, clients, ticketsConcernes,
    panierMoyen: ticketsConcernes ? ca / ticketsConcernes : 0,
    caMoyenClient: clients ? ca / clients : 0,
    remiseMoyenne: remises ? montantRemise / remises : 0,
    tauxRemise: (ca + montantRemise) ? montantRemise / (ca + montantRemise) * 100 : 0,
    services,
    tickets: ticketRows,
    updatedAt: new Date().toISOString()
  };
}
function loadAll() {
  const out = {};
  for (const y of ['2025','2026']) {
    if (fs.existsSync(files[y])) {
      const html = fs.readFileSync(files[y], 'utf8');
      out[y] = parseReport(html);
      out[y].saved = true;
    } else {
      out[y] = { saved:false, remises:0,montantRemise:0,ca:0,clients:0,ticketsConcernes:0,services:{midi:{clients:0},soir:{clients:0},non_detecte:{clients:0}} };
    }
  }
  const c25 = out['2025'].clients || 0, c26 = out['2026'].clients || 0;
  out.comparison = {
    clientsDelta: c26 - c25,
    clientsDeltaPct: c25 ? ((c26-c25)/c25*100) : null,
    midiDelta: (out['2026'].services?.midi?.clients||0) - (out['2025'].services?.midi?.clients||0),
    soirDelta: (out['2026'].services?.soir?.clients||0) - (out['2025'].services?.soir?.clients||0)
  };
  return out;
}

const server = http.createServer((req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/data') return sendJson(res,200,loadAll());
  if (req.method === 'GET' && url.pathname.startsWith('/saved/')) {
    const y = url.pathname.includes('2025') ? '2025' : '2026';
    if (!fs.existsSync(files[y])) return send(res,404,'Aucun HTML sauvegardé','text/plain');
    return send(res,200,fs.readFileSync(files[y]),'text/html; charset=utf-8');
  }
  if (req.method === 'POST' && url.pathname.startsWith('/api/upload/')) {
    const y = url.pathname.endsWith('/2025') ? '2025' : url.pathname.endsWith('/2026') ? '2026' : null;
    if (!y) return sendJson(res,400,{error:'Année invalide'});
    let body = Buffer.alloc(0);
    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
      if (body.length > 50 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      const html = body.toString('utf8');
      if (!html || !/<html|<table|OPE/i.test(html)) return sendJson(res,400,{error:'Fichier HTML invalide'});
      fs.writeFileSync(files[y], html, 'utf8');
      sendJson(res,200,{ok:true, year:y, data:parseReport(html)});
    });
    return;
  }
  serveStatic(req,res);
});
server.listen(PORT, ()=> console.log(`FLAMS dashboard running on port ${PORT}`));