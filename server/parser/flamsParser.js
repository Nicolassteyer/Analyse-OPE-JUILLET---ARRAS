import fs from "node:fs/promises";

export async function parseFlamsHtml(filePath, year) {
  const html = await fs.readFile(filePath, "utf8");

  return {
    year,
    parserVersion: "sprint-1-placeholder",
    detected: {
      hasTable: /table/i.test(html),
      hasTicket: /ticket/i.test(html),
      hasCovers: /number of covers/i.test(html),
      hasDiscount: /total remise|remise/i.test(html),
      hasTotalToPay: /total to pay/i.test(html),
      hasOperation: /ope juillet arras/i.test(html)
    },
    tickets: [],
    kpis: {
      discountsCount: 0,
      discountsQuantity: 0,
      discountAmount: 0,
      revenueConcerned: 0,
      ticketsCount: 0,
      clientsCount: 0
    }
  };
}
