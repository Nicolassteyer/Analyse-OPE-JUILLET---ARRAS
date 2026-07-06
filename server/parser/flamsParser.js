import fs from "node:fs/promises";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const orderedDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toNumber(value) {
  if (!value) {
    return 0;
  }

  return Number(String(value).replace(/\s/g, "").replace(",", ".")) || 0;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "\n");
}

function extractDates(text) {
  const matches = [...text.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g)].map((match) => {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  });
  const validDates = matches.filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => a - b);
  const format = (date) => date?.toLocaleDateString("fr-FR") || null;

  return {
    dates: validDates,
    startDate: format(validDates[0]),
    endDate: format(validDates[validDates.length - 1]),
  };
}

function extractFirst(block, pattern) {
  return toNumber(block.match(pattern)?.[1]);
}

function splitTicketBlocks(text) {
  return text
    .split(/(?=Table:\s*\S+\s+(?:N° Note|Note number):?\s*\d+\s+Number of covers:\s*\d+)/i)
    .filter((block) => /^Table:/i.test(block.trim()));
}

function parseOpenedAt(block, fallbackDate) {
  const match = block.match(/(?:Table ouverte par|Table opened by):[\s\S]*?@\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\s+(\d{1,2}):(\d{2})/i);
  if (!match) {
    return fallbackDate || null;
  }

  const [, day, month, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function serviceFromDate(date) {
  if (!date) {
    return "unknown";
  }

  return date.getHours() < 15 ? "lunch" : "dinner";
}

function parseTicket(block, fallbackDate) {
  const openedAt = parseOpenedAt(block, fallbackDate);
  const noteNumber = block.match(/(?:N° Note|Note number):?\s*(\d+)/i)?.[1] || null;
  const tableName = block.match(/Table:\s*(\S+)/i)?.[1] || null;
  const covers = extractFirst(block, /Number of covers:\s*(-?\d+)/i);
  const totalToPay = extractFirst(block, /TOTAL (?:A PAYER|TO PAY):\s*([-\d\s,.]+)/i);
  const discount = extractFirst(block, /Total remise:\s*([-\d\s,.]+)/i);
  const discountQuantity = extractDiscountQuantity(block);
  const subtotal = extractFirst(block, /SOUS-TOTAL:\s*([-\d\s,.]+)/i);
  const hasOperationDiscount = /OPE JUILLET ARRAS/i.test(block);

  return {
    ticketNumber: noteNumber,
    tableName,
    covers,
    totalToPay,
    subtotal,
    discount,
    discountQuantity,
    hasOperationDiscount,
    service: serviceFromDate(openedAt),
    day: openedAt && !Number.isNaN(openedAt.getTime()) ? dayLabels[openedAt.getDay()] : "Non date",
    openedAt: openedAt?.toISOString() || null,
  };
}

function extractDiscountQuantity(block) {
  const section = block.match(/(?:Raison de remise|Reason of discount)[\s\S]*?(?=TOTAL (?:A PAYER|TO PAY)|Payment modes|$)/i)?.[0] || "";
  const lines = section.split("\n");

  return lines.reduce((sum, line) => {
    const match = line.match(/^\s*(-?\d+(?:[,.]\d+)?)\s+.+?\s+(-?\d+(?:[,.]\d{2}))\s{2,}/);
    return sum + (match ? toNumber(match[1]) : 0);
  }, 0);
}

function summarizeTickets(tickets) {
  const lunchTickets = tickets.filter((ticket) => ticket.service === "lunch");
  const dinnerTickets = tickets.filter((ticket) => ticket.service === "dinner");
  const revenueConcerned = tickets.reduce((sum, ticket) => sum + ticket.totalToPay, 0);
  const discountAmount = tickets.reduce((sum, ticket) => sum + ticket.discount, 0);
  const discountsQuantity = tickets.reduce((sum, ticket) => sum + ticket.discountQuantity, 0);
  const clientsCount = tickets.reduce((sum, ticket) => sum + ticket.covers, 0);
  const ticketsCount = tickets.length;

  return {
    discountsCount: tickets.filter((ticket) => ticket.discount > 0).length,
    discountsQuantity,
    discountAmount,
    revenueConcerned,
    ticketsCount,
    clientsCount,
    lunchClients: lunchTickets.reduce((sum, ticket) => sum + ticket.covers, 0),
    dinnerClients: dinnerTickets.reduce((sum, ticket) => sum + ticket.covers, 0),
    lunchTickets: lunchTickets.length,
    dinnerTickets: dinnerTickets.length,
    averageTicket: ticketsCount ? revenueConcerned / ticketsCount : 0,
    averageRevenuePerClient: clientsCount ? revenueConcerned / clientsCount : 0,
    discountRate: revenueConcerned ? (discountAmount / (revenueConcerned + discountAmount)) * 100 : 0,
  };
}

function dailyClientsFor(tickets) {
  return orderedDays.map((day) => ({
    day,
    clients: tickets.filter((ticket) => ticket.day === day).reduce((sum, ticket) => sum + ticket.covers, 0),
  }));
}

export async function parseFlamsHtml(filePath, year) {
  const html = await fs.readFile(filePath, "utf8");
  const text = stripHtml(html);
  const period = extractDates(text);
  const tickets = splitTicketBlocks(text)
    .map((block) => parseTicket(block, period.dates[0]))
    .filter((ticket) => ticket.ticketNumber || ticket.covers || ticket.totalToPay || ticket.discount);
  const operationTickets = tickets.filter((ticket) => ticket.hasOperationDiscount);
  const discountedTickets = tickets.filter((ticket) => ticket.discount > 0);
  const analysisTickets = operationTickets.length ? operationTickets : discountedTickets.length ? discountedTickets : tickets;
  const scope = operationTickets.length ? "OPE JUILLET ARRAS" : discountedTickets.length ? "Tickets remises" : "Tous tickets";

  return {
    year,
    parserVersion: "sprint-2-flams-table-blocks",
    scope,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
    },
    detected: {
      hasTable: /Table:/i.test(text),
      hasTicket: tickets.length > 0,
      hasCovers: /Number of covers/i.test(text),
      hasDiscount: /total remise|discount/i.test(text),
      hasTotalToPay: /TOTAL A PAYER|TOTAL TO PAY/i.test(text),
      hasOperation: /OPE JUILLET ARRAS/i.test(text),
    },
    dailyClients: dailyClientsFor(analysisTickets),
    allTicketsDailyClients: dailyClientsFor(tickets),
    allTicketsKpis: summarizeTickets(tickets),
    tickets: analysisTickets,
    kpis: summarizeTickets(analysisTickets),
  };
}
