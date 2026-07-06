
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const REPORT_HTML = path.join(DATA_DIR, 'latest-report.html');
const REPORT_JSON = path.join(DATA_DIR, 'latest-analysis.json');

const fastify = Fastify({ logger: true });
await fastify.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

function moneyToNumber(value) {
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[€\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function numberFromText(value) {
  if (!value) return 0;
  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractTables(rawHtml) {
  const root = parse(rawHtml);
  const tables = [];
  for (const table of root.querySelectorAll('table')) {
    const rows = table.querySelectorAll('tr').map(tr =>
      tr.querySelectorAll('th,td').map(td => td.text.trim().replace(/\s+/g, ' '))
    ).filter(r => r.length);
    if (rows.length) tables.push(rows);
  }
  return tables;
}


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

function analyseReport(rawHtml, targetDiscount = 'OPE JUILLET ARRAS') {
  const target = normalize(targetDiscount);

  // Les rapports FLAMS sont essentiellement du texte préformaté dans un seul <table>.
  // La version précédente essayait de lire des colonnes HTML classiques, ce qui mélangeait les dates,
  // les tickets et les montants. Ici on travaille ticket par ticket.
  const text = rawHtml
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

  const chunks = text.split(/(?=\bTable:\s*\d+)/g).filter(chunk => normalize(chunk).includes(target));

  let discountQty = 0;
  let discountAmount = 0;
  let ticketsWithDiscount = 0;
  let caTickets = 0;
  let clients = 0;
  let articles = 0;
  const ticketRows = [];
  const daily = new Map();

  const periodDates = [...text.matchAll(/(\d{2}[./-]\d{2}[./-]\d{4})/g)].map(m => m[1]);
  const uniqueDates = [...new Set(periodDates)];
  const period = uniqueDates.length
    ? `${uniqueDates[0]}${uniqueDates.length > 1 ? ' - ' + uniqueDates[uniqueDates.length - 1] : ''}`
    : 'Non détectée';

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map(line => line.trim()).filter(Boolean);
    const ticketNumber = (chunk.match(/Note number:\s*(\d+)/i) || [])[1] || String(ticketRows.length + 1);
    const date = (chunk.match(/(\d{2}[./-]\d{2}[./-]\d{4})/) || [])[1] || 'Non détectée';
    const covers = parseFloatFr((chunk.match(/Number of covers:\s*(\d+)/i) || [])[1]);

    let ticketQty = 0;
    let ticketDiscount = 0;
    let targetLineCount = 0;
    let ticketCA = 0;
    let ticketArticles = 0;

    for (const line of lines) {
      const normalizedLine = normalize(line);

      // Exemple:
      // 2 FORMULE ELSASSICH 28,60 OPE JUILLET ARRAS 02.07.2026 14: DAMIEN R
      if (normalizedLine.includes(target)) {
        const m = line.match(/^\s*(-?\d+(?:[,.]\d+)?)\s+(.+?)\s+(-?\d+(?:[,.]\d+)?)\s+OPE\s+JUILLET\s+ARRAS\b/i);
        if (m) {
          const q = parseFloatFr(m[1]);
          const amount = parseFloatFr(m[3]);
          ticketQty += q;
          ticketDiscount += amount;
          targetLineCount += 1;
        }
      }

      if (/TOTAL TO PAY:/i.test(line)) {
        // Le montant est souvent sur la ligne suivante, donc on le lira plus bas aussi.
        continue;
      }

      // lignes articles de la partie "Price without discount"
      if (/^-?\d+(?:[,.]\d+)?\s+/.test(line) && !/OPE\s+JUILLET\s+ARRAS/i.test(line) && !/TOTAL|REMISE|PAY|SOUS-TOTAL/i.test(line)) {
        const first = line.match(/^-?\d+(?:[,.]\d+)?/);
        if (first) ticketArticles += Math.abs(parseFloatFr(first[0]));
      }
    }

    const totalPayMatch = chunk.match(/TOTAL TO PAY:\s*([\d.,-]+)/i);
    if (totalPayMatch) ticketCA = Math.abs(parseFloatFr(totalPayMatch[1]));

    // Certains exports mettent le montant à la ligne après "TOTAL TO PAY:".
    if (!ticketCA) {
      const totalPayBlock = chunk.match(/TOTAL TO PAY:\s*\n?\s*([\d.,-]+)/i);
      if (totalPayBlock) ticketCA = Math.abs(parseFloatFr(totalPayBlock[1]));
    }

    // On compte le ticket dès qu'il contient une ligne OPE, même si elle est annulée ensuite.
    // Mais pour les KPI nombre/montant, on prend le NET: les lignes négatives annulent les positives.
    ticketsWithDiscount += 1;
    discountQty += ticketQty;
    discountAmount += ticketDiscount;
    caTickets += ticketCA;
    clients += covers;
    articles += ticketArticles;

    const row = {
      ticket: ticketNumber,
      date,
      remiseQt: ticketQty,
      remiseMontant: ticketDiscount,
      ca: ticketCA,
      clients: covers,
      articles: ticketArticles,
      hasOpeLines: targetLineCount > 0
    };
    ticketRows.push(row);

    const current = daily.get(date) || { date, remiseQt: 0, remiseMontant: 0, ca: 0, clients: 0, tickets: 0 };
    current.remiseQt += ticketQty;
    current.remiseMontant += ticketDiscount;
    current.ca += ticketCA;
    current.clients += covers;
    current.tickets += 1;
    daily.set(date, current);
  }

  // Arrondis monnaie pour éviter 1072.499999999.
  discountQty = Math.round(discountQty * 100) / 100;
  discountAmount = Math.round(discountAmount * 100) / 100;
  caTickets = Math.round(caTickets * 100) / 100;

  const avgTicket = ticketsWithDiscount ? caTickets / ticketsWithDiscount : 0;
  const avgClient = clients ? caTickets / clients : 0;
  const discountRate = caTickets || discountAmount ? (discountAmount / (caTickets + discountAmount)) * 100 : 0;
  const remisesPerTicket = ticketsWithDiscount ? discountQty / ticketsWithDiscount : 0;

  return {
    discountName: targetDiscount,
    importedAt: new Date().toISOString(),
    period,
    kpis: {
      discountQty,
      discountAmount,
      discountInitialAmount: discountAmount,
      ticketsWithDiscount,
      caTickets,
      clients,
      articles,
      avgTicket,
      avgClient,
      discountRate,
      remisesPerTicket
    },
    charts: {
      distributionTickets: ticketRows.map(t => ({
        ticket: t.ticket,
        date: t.date,
        ca: t.ca,
        clients: t.clients,
        remise: Math.round(t.remiseMontant * 100) / 100,
        qty: t.remiseQt
      })),
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
      totals: [
        { label: 'CA tickets', value: caTickets },
        { label: 'Remises', value: discountAmount }
      ]
    }
  };
}

fastify.get('/api/report', async (_, reply) => {
  try {
    const data = await fs.readFile(REPORT_JSON, 'utf8');
    return JSON.parse(data);
  } catch {
    reply.code(404);
    return { error: 'Aucun rapport importé' };
  }
});

fastify.post('/api/upload', async (request, reply) => {
  const file = await request.file();
  if (!file) {
    reply.code(400);
    return { error: 'Fichier manquant' };
  }
  const buffer = await file.toBuffer();
  const html = buffer.toString('utf8');
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REPORT_HTML, html);
  const analysis = analyseReport(html);
  await fs.writeFile(REPORT_JSON, JSON.stringify(analysis, null, 2));
  return analysis;
});

fastify.get('/api/download-html', async (_, reply) => {
  try {
    return reply.header('Content-Type', 'text/html; charset=utf-8').send(await fs.readFile(REPORT_HTML));
  } catch {
    reply.code(404).send('Aucun HTML sauvegardé');
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
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
      };
      reply.header('Content-Type', types[ext] || 'application/octet-stream');
      return await fs.readFile(filePath);
    } catch {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return await fs.readFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
});

const port = process.env.PORT || 3000;
fastify.listen({ port, host: '0.0.0.0' });
