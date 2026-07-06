
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

function analyseReport(rawHtml, targetDiscount = 'OPE JUILLET ARRAS') {
  const target = normalize(targetDiscount);
  const tables = extractTables(rawHtml);
  let discountQty = 0;
  let discountAmount = 0;
  let discountInitialAmount = 0;
  let ticketsWithDiscount = 0;
  let caTickets = 0;
  let clients = 0;
  let articles = 0;
  const ticketRows = [];

  const fullText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const dateMatch = fullText.match(/(\d{2}[./-]\d{2}[./-]\d{2,4})\s*(?:-|au|à|to)?\s*(\d{2}[./-]\d{2}[./-]\d{2,4})?/i);

  for (const rows of tables) {
    const flat = normalize(rows.flat().join(' '));

    // Summary remise table: Localisation / Nombre d'articles / Montant initial / Remise totale
    if (flat.includes(target) || flat.includes('REMISE TOTALE') || flat.includes("NOMBRE D'ARTICLES")) {
      for (const row of rows) {
        const joined = normalize(row.join(' '));
        if (joined.includes('FLAMS ARRAS') || joined.includes(target) || /^\s*#?\s*1\s*$/.test(row[0] || '')) {
          // Prefer rows with 5+ columns like the reference tool.
          if (row.length >= 4) {
            const nums = row.map(c => moneyToNumber(c));
            const qtyCandidate = row.map(c => numberFromText(c)).find(n => Math.abs(n) > 0 && Math.abs(n) < 100000);
            const moneyValues = nums.filter(n => Math.abs(n) > 0);
            if (qtyCandidate && moneyValues.length >= 1 && (joined.includes('FLAMS ARRAS') || joined.includes('# 1') || joined.includes(target))) {
              // Avoid overwriting with ticket rows by looking for exact 1072-style summary patterns.
              if (row.length >= 5 || joined.includes('100.00') || joined.includes('100,00')) {
                discountQty = Math.max(discountQty, Math.abs(qtyCandidate));
                if (moneyValues.length >= 2) {
                  discountInitialAmount = Math.max(discountInitialAmount, Math.abs(moneyValues[0]));
                  discountAmount = Math.max(discountAmount, Math.abs(moneyValues[1]));
                } else {
                  discountAmount = Math.max(discountAmount, Math.abs(moneyValues[0]));
                }
              }
            }
          }
        }
      }
    }

    // Ticket tables usually contain Total remise and Total TTC / Couvert
    if (flat.includes(target) && (flat.includes('TOTAL REMISE') || flat.includes('TOTAL TTC') || flat.includes('COUVERT'))) {
      let ticketHasDiscount = false;
      let ticketDiscountQty = 0;
      let ticketDiscountAmount = 0;
      let ticketCA = 0;
      let ticketClients = 0;
      let ticketArticles = 0;

      for (const row of rows) {
        const joined = normalize(row.join(' '));
        if (joined.includes(target)) {
          ticketHasDiscount = true;
          const qty = numberFromText(row[0]);
          ticketDiscountQty += qty || 1;
          const amounts = row.map(c => moneyToNumber(c)).filter(n => Math.abs(n) > 0);
          if (amounts.length) ticketDiscountAmount += Math.abs(amounts[amounts.length - 1]);
        }
        if (joined.includes('TOTAL TTC') || joined.includes('TOTAL A PAYER') || joined.includes('TOTAL PAYE')) {
          const amounts = row.map(c => moneyToNumber(c)).filter(n => Math.abs(n) > 0);
          if (amounts.length) ticketCA = Math.max(ticketCA, Math.abs(amounts[amounts.length - 1]));
        }
        if (joined.includes('COUVERT') || joined.includes('CLIENT')) {
          const nums = row.map(c => numberFromText(c)).filter(n => n > 0 && n < 1000);
          if (nums.length) ticketClients = Math.max(ticketClients, nums[nums.length - 1]);
        }
        // Product lines: first col qty + price somewhere.
        if (row.length >= 3 && /^-?\d+([,.]\d+)?$/.test(String(row[0]).trim())) {
          const designation = normalize(row.slice(1, -1).join(' '));
          if (designation && !designation.includes('REMISE') && !designation.includes('TOTAL')) {
            ticketArticles += Math.abs(numberFromText(row[0]));
          }
        }
      }

      if (ticketHasDiscount) {
        ticketsWithDiscount += 1;
        caTickets += ticketCA;
        clients += ticketClients;
        articles += ticketArticles;
        ticketRows.push({
          remiseQt: ticketDiscountQty,
          remiseMontant: ticketDiscountAmount,
          ca: ticketCA,
          clients: ticketClients,
          articles: ticketArticles
        });
      }
    }
  }

  // Fallback if no summary table found: use ticket detail totals.
  if (!discountQty) discountQty = ticketRows.reduce((s,t)=>s + Math.abs(t.remiseQt), 0);
  if (!discountAmount) discountAmount = ticketRows.reduce((s,t)=>s + Math.abs(t.remiseMontant), 0);
  if (!discountInitialAmount) discountInitialAmount = discountAmount;

  const avgTicket = ticketsWithDiscount ? caTickets / ticketsWithDiscount : 0;
  const avgClient = clients ? caTickets / clients : 0;
  const discountRate = caTickets ? (discountAmount / (caTickets + discountAmount)) * 100 : 0;
  const conversion = ticketsWithDiscount ? discountQty / ticketsWithDiscount : 0;

  return {
    discountName: targetDiscount,
    importedAt: new Date().toISOString(),
    period: dateMatch ? `${dateMatch[1]}${dateMatch[2] ? ' - ' + dateMatch[2] : ''}` : 'Non détectée',
    kpis: {
      discountQty,
      discountAmount,
      discountInitialAmount,
      ticketsWithDiscount,
      caTickets,
      clients,
      articles,
      avgTicket,
      avgClient,
      discountRate,
      remisesPerTicket: conversion
    },
    charts: {
      distributionTickets: ticketRows.map((t, i) => ({ ticket: i + 1, ca: t.ca, clients: t.clients, remise: t.remiseMontant })),
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
