
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const YEARS = ['2026', '2025'];
const DISCOUNT_NAME = 'OPE JUILLET ARRAS';

const fastify = Fastify({ logger: true });
await fastify.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

function parseFloatFr(value) {
  if (value === undefined || value === null) return 0;
  const cleaned = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function cleanHtmlToText(rawHtml) {
  return rawHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>|<\/p>|<\/tr>|<\/table>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&euro;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n');
}

function detectService(chunk) {
  const opened = chunk.match(/Table opened by:.*?@\s*(\d{2}[./-]\d{2}[./-]\d{4})\s+(\d{1,2}):(\d{2})/i);
  const anyDateTime = chunk.match(/(\d{2}[./-]\d{2}[./-]\d{4})\s+(\d{1,2}):(\d{2})/i);
  const m = opened || anyDateTime;
  if (!m) return { service: 'Non détecté', hour: null, time: null };
  const hour = Number.parseInt(m[2], 10);
  return {
    service: hour < 17 ? 'Midi' : 'Soir',
    hour,
    time: `${String(hour).padStart(2, '0')}:${m[3]}`
  };
}

function analyseReport(rawHtml, year, targetDiscount = DISCOUNT_NAME) {
  const target = normalize(targetDiscount);
  const text = cleanHtmlToText(rawHtml);
  const chunks = text.split(/(?=\bTable:\s*\d+)/g).filter(chunk => normalize(chunk).includes(target));

  let discountQty = 0;
  let discountAmount = 0;
  let ticketsWithDiscount = 0;
  let caTickets = 0;
  let clients = 0;
  let articles = 0;

  const serviceTotals = {
    Midi: { service: 'Midi', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 },
    Soir: { service: 'Soir', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 },
    'Non détecté': { service: 'Non détecté', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 }
  };

  const ticketRows = [];
  const daily = new Map();

  const periodDates = [...text.matchAll(/(\d{2}[./-]\d{2}[./-]\d{4})/g)]
    .map(m => m[1])
    .filter(d => !year || d.endsWith(String(year)));
  const uniqueDates = [...new Set(periodDates)];
  const period = uniqueDates.length
    ? `${uniqueDates[0]}${uniqueDates.length > 1 ? ' - ' + uniqueDates[uniqueDates.length - 1] : ''}`
    : 'Non détectée';

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map(line => line.trim()).filter(Boolean);
    const ticketNumber = (chunk.match(/Note number:\s*(\d+)/i) || [])[1] || String(ticketRows.length + 1);
    const date = (chunk.match(/(\d{2}[./-]\d{2}[./-]\d{4})/) || [])[1] || 'Non détectée';
    const covers = parseFloatFr((chunk.match(/Number of covers:\s*(\d+)/i) || [])[1]);
    const { service, time } = detectService(chunk);

    let ticketQty = 0;
    let ticketDiscount = 0;
    let targetLineCount = 0;
    let ticketCA = 0;
    let ticketArticles = 0;

    for (const line of lines) {
      const normalizedLine = normalize(line);

      if (normalizedLine.includes(target)) {
        const escaped = targetDiscount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const m = line.match(new RegExp(String.raw`^\s*(-?\d+(?:[,.]\d+)?)\s+(.+?)\s+(-?\d+(?:[,.]\d+)?)\s+${escaped}\b`, 'i'));
        if (m) {
          const q = parseFloatFr(m[1]);
          const amount = parseFloatFr(m[3]);
          ticketQty += q;
          ticketDiscount += amount;
          targetLineCount += 1;
        }
      }

      if (/^-?\d+(?:[,.]\d+)?\s+/.test(line) && !/OPE\s+JUILLET\s+ARRAS/i.test(line) && !/TOTAL|REMISE|PAY|SOUS-TOTAL/i.test(line)) {
        const first = line.match(/^-?\d+(?:[,.]\d+)?/);
        if (first) ticketArticles += Math.abs(parseFloatFr(first[0]));
      }
    }

    const totalPayMatch = chunk.match(/TOTAL TO PAY:\s*([\d.,-]+)/i) || chunk.match(/TOTAL TO PAY:\s*\n?\s*([\d.,-]+)/i);
    if (totalPayMatch) ticketCA = Math.abs(parseFloatFr(totalPayMatch[1]));

    ticketsWithDiscount += 1;
    discountQty += ticketQty;
    discountAmount += ticketDiscount;
    caTickets += ticketCA;
    clients += covers;
    articles += ticketArticles;

    const svc = serviceTotals[service] || serviceTotals['Non détecté'];
    svc.clients += covers;
    svc.tickets += 1;
    svc.ca += ticketCA;
    svc.discountQty += ticketQty;
    svc.discountAmount += ticketDiscount;

    const row = { ticket: ticketNumber, date, time, service, remiseQt: ticketQty, remiseMontant: ticketDiscount, ca: ticketCA, clients: covers, articles: ticketArticles, hasOpeLines: targetLineCount > 0 };
    ticketRows.push(row);

    const dayKey = `${date} ${service}`;
    const current = daily.get(dayKey) || { date, service, remiseQt: 0, remiseMontant: 0, ca: 0, clients: 0, tickets: 0 };
    current.remiseQt += ticketQty;
    current.remiseMontant += ticketDiscount;
    current.ca += ticketCA;
    current.clients += covers;
    current.tickets += 1;
    daily.set(dayKey, current);
  }

  discountQty = Math.round(discountQty * 100) / 100;
  discountAmount = Math.round(discountAmount * 100) / 100;
  caTickets = Math.round(caTickets * 100) / 100;
  for (const svc of Object.values(serviceTotals)) {
    svc.ca = Math.round(svc.ca * 100) / 100;
    svc.discountAmount = Math.round(svc.discountAmount * 100) / 100;
    svc.discountQty = Math.round(svc.discountQty * 100) / 100;
  }

  const avgTicket = ticketsWithDiscount ? caTickets / ticketsWithDiscount : 0;
  const avgClient = clients ? caTickets / clients : 0;
  const discountRate = caTickets || discountAmount ? (discountAmount / (caTickets + discountAmount)) * 100 : 0;
  const remisesPerTicket = ticketsWithDiscount ? discountQty / ticketsWithDiscount : 0;

  return {
    year: String(year),
    discountName: targetDiscount,
    importedAt: new Date().toISOString(),
    period,
    kpis: { discountQty, discountAmount, discountInitialAmount: discountAmount, ticketsWithDiscount, caTickets, clients, articles, avgTicket, avgClient, discountRate, remisesPerTicket },
    services: Object.values(serviceTotals),
    charts: {
      distributionTickets: ticketRows.map(t => ({ ticket: t.ticket, date: t.date, time: t.time, service: t.service, ca: t.ca, clients: t.clients, remise: Math.round(t.remiseMontant * 100) / 100, qty: t.remiseQt })),
      daily: [...daily.values()].sort((a, b) => `${a.date}${a.service}`.localeCompare(`${b.date}${b.service}`)),
      totals: [{ label: 'CA tickets', value: caTickets }, { label: 'Remises', value: discountAmount }]
    }
  };
}

function emptyAnalysis(year) {
  return {
    year: String(year),
    discountName: DISCOUNT_NAME,
    importedAt: null,
    period: 'Aucun fichier',
    kpis: { discountQty: 0, discountAmount: 0, discountInitialAmount: 0, ticketsWithDiscount: 0, caTickets: 0, clients: 0, articles: 0, avgTicket: 0, avgClient: 0, discountRate: 0, remisesPerTicket: 0 },
    services: [
      { service: 'Midi', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 },
      { service: 'Soir', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 },
      { service: 'Non détecté', clients: 0, tickets: 0, ca: 0, discountQty: 0, discountAmount: 0 }
    ],
    charts: { distributionTickets: [], daily: [], totals: [{ label: 'CA tickets', value: 0 }, { label: 'Remises', value: 0 }] }
  };
}

function htmlPath(year) { return path.join(DATA_DIR, String(year), 'latest-report.html'); }
function jsonPath(year) { return path.join(DATA_DIR, String(year), 'latest-analysis.json'); }

async function readAnalysis(year) {
  try {
    return JSON.parse(await fs.readFile(jsonPath(year), 'utf8'));
  } catch {
    return emptyAnalysis(year);
  }
}

function getServiceClients(analysis, service) {
  return Number((analysis.services || []).find(s => s.service === service)?.clients || 0);
}

function buildComparison(y2026, y2025) {
  const services = ['Midi', 'Soir'];
  const byService = services.map(service => {
    const clients2026 = getServiceClients(y2026, service);
    const clients2025 = getServiceClients(y2025, service);
    const delta = clients2026 - clients2025;
    const deltaPct = clients2025 ? (delta / clients2025) * 100 : null;
    return { service, clients2026, clients2025, delta, deltaPct };
  });
  const total2026 = Number(y2026.kpis?.clients || 0);
  const total2025 = Number(y2025.kpis?.clients || 0);
  const delta = total2026 - total2025;
  return {
    clients: {
      total2026,
      total2025,
      delta,
      deltaPct: total2025 ? (delta / total2025) * 100 : null,
      byService
    }
  };
}

fastify.get('/api/report', async () => {
  const y2026 = await readAnalysis('2026');
  const y2025 = await readAnalysis('2025');
  return { years: { '2026': y2026, '2025': y2025 }, comparison: buildComparison(y2026, y2025) };
});

fastify.get('/api/report/:year', async (request, reply) => {
  const { year } = request.params;
  if (!YEARS.includes(String(year))) {
    reply.code(400);
    return { error: 'Année invalide' };
  }
  return readAnalysis(year);
});

fastify.post('/api/upload/:year', async (request, reply) => {
  const { year } = request.params;
  if (!YEARS.includes(String(year))) {
    reply.code(400);
    return { error: 'Année invalide' };
  }
  const file = await request.file();
  if (!file) {
    reply.code(400);
    return { error: 'Fichier manquant' };
  }
  const buffer = await file.toBuffer();
  const html = buffer.toString('utf8');
  const dir = path.join(DATA_DIR, String(year));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(htmlPath(year), html);
  const analysis = analyseReport(html, year);
  await fs.writeFile(jsonPath(year), JSON.stringify(analysis, null, 2));
  const y2026 = year === '2026' ? analysis : await readAnalysis('2026');
  const y2025 = year === '2025' ? analysis : await readAnalysis('2025');
  return { years: { '2026': y2026, '2025': y2025 }, comparison: buildComparison(y2026, y2025) };
});

// Ancienne route conservée: upload = 2026.
fastify.post('/api/upload', async (request, reply) => {
  request.params = { year: '2026' };
  return fastify.inject ? reply.code(410).send({ error: 'Utilise /api/upload/2026' }) : null;
});

fastify.get('/api/download-html/:year', async (request, reply) => {
  const { year } = request.params;
  if (!YEARS.includes(String(year))) {
    reply.code(400);
    return 'Année invalide';
  }
  try {
    return reply.header('Content-Type', 'text/html; charset=utf-8').send(await fs.readFile(htmlPath(year)));
  } catch {
    reply.code(404).send(`Aucun HTML ${year} sauvegardé`);
  }
});

fastify.get('/api/download-html', async (_, reply) => {
  try {
    return reply.header('Content-Type', 'text/html; charset=utf-8').send(await fs.readFile(htmlPath('2026')));
  } catch {
    reply.code(404).send('Aucun HTML 2026 sauvegardé');
  }
});

fastify.register(async function (app) {
  app.get('/*', async (req, reply) => {
    let urlPath = req.params['*'] || 'index.html';
    if (!urlPath || urlPath === '/' || urlPath === 'dashboard') urlPath = 'index.html';
    const safePath = path.normalize(urlPath).replace(/^([.][.][/\\])+/, '');
    const filePath = path.join(__dirname, 'public', safePath);
    try {
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.svg': 'image/svg+xml'
      };
      return reply.header('Content-Type', types[ext] || 'application/octet-stream').send(await fs.readFile(filePath));
    } catch {
      reply.code(404).send('Not Found');
    }
  });
});

const port = Number(process.env.PORT || 3000);
await fastify.listen({ port, host: '0.0.0.0' });
