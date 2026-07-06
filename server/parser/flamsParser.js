import fs from "node:fs/promises";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

function extractNumbers(text, labels) {
  return labels.flatMap((label) => {
    const pattern = new RegExp(`${label}\\s*:?\\s*(-?\\d+[\\d\\s]*(?:[,.]\\d+)?)`, "gi");
    return [...text.matchAll(pattern)].map((match) => toNumber(match[1]));
  });
}

function splitTicketBlocks(text) {
  const blocks = text.split(/(?=\bTicket\b\s*[:#]?\s*\d*)/i).filter((block) => /ticket|total to pay|number of covers/i.test(block));
  if (blocks.length > 1) {
    return blocks;
  }

  return text.split(/(?=\bTOTAL TO PAY\b)/i).filter((block) => /total to pay|number of covers/i.test(block));
}

function getService(hour) {
  if (hour === null) {
    return "unknown";
  }

  return hour < 15 ? "lunch" : "dinner";
}

function parseTicket(block, fallbackDate) {
  const covers = extractNumbers(block, ["Number of covers", "Couverts", "Clients"])[0] || 0;
  const totalToPay = extractNumbers(block, ["TOTAL TO PAY", "Total a payer", "Total"])[0] || 0;
  const discount = extractNumbers(block, ["Total remise", "Remise"])[0] || 0;
  const timeMatch = block.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
  const hour = timeMatch ? Number(timeMatch[1]) : null;
  const dateMatch = block.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
  const date = dateMatch ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])) : fallbackDate;

  return {
    covers,
    totalToPay,
    discount,
    service: getService(hour),
    day: date && !Number.isNaN(date.getTime()) ? dayLabels[date.getDay()] : "Non date",
  };
}

export async function parseFlamsHtml(filePath, year) {
  const html = await fs.readFile(filePath, "utf8");
  const text = stripHtml(html);
  const period = extractDates(text);
  const blocks = splitTicketBlocks(text);
  const tickets = blocks.map((block) => parseTicket(block, period.dates[0])).filter((ticket) => ticket.covers || ticket.totalToPay || ticket.discount);

  const fallbackClients = extractNumbers(text, ["Number of covers", "Couverts", "Clients"]).reduce((sum, value) => sum + value, 0);
  const fallbackRevenue = extractNumbers(text, ["TOTAL TO PAY", "CA", "Total"]).reduce((sum, value) => sum + value, 0);
  const clientsCount = tickets.reduce((sum, ticket) => sum + ticket.covers, 0) || fallbackClients;
  const revenueConcerned = tickets.reduce((sum, ticket) => sum + ticket.totalToPay, 0) || fallbackRevenue;
  const ticketsCount = tickets.length || [...text.matchAll(/\bTicket\b/gi)].length;
  const lunchTickets = tickets.filter((ticket) => ticket.service === "lunch");
  const dinnerTickets = tickets.filter((ticket) => ticket.service === "dinner");
  const discountAmount = tickets.reduce((sum, ticket) => sum + ticket.discount, 0);

  const dailyClients = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => ({
    day,
    clients: tickets.filter((ticket) => ticket.day === day).reduce((sum, ticket) => sum + ticket.covers, 0),
  }));

  return {
    year,
    parserVersion: "sprint-2-basic-html",
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
    },
    detected: {
      hasTable: /table/i.test(text),
      hasTicket: /ticket/i.test(text),
      hasCovers: /number of covers|couverts|clients/i.test(text),
      hasDiscount: /total remise|remise/i.test(text),
      hasTotalToPay: /total to pay|total a payer/i.test(text),
      hasOperation: /ope juillet arras/i.test(text),
    },
    dailyClients,
    tickets,
    kpis: {
      discountsCount: tickets.filter((ticket) => ticket.discount > 0).length,
      discountsQuantity: 0,
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
      discountRate: revenueConcerned ? (discountAmount / revenueConcerned) * 100 : 0,
    },
  };
}
