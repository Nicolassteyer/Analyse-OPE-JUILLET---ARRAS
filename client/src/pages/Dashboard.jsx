import { RevenueChart } from "../components/charts/RevenueChart.jsx";
import { KpiCard } from "../components/dashboard/KpiCard.jsx";
import { getActiveImport, getGlobalKpis, getKpis, useAnalysisStore } from "../hooks/useAnalysisStore.jsx";
import { formatCurrency } from "../utils/formatters.js";

function periodLabel(importResult) {
  const period = importResult?.parsed?.period;
  if (!period?.startDate && !period?.endDate) {
    return "Dates exactes en attente de parsing";
  }

  if (period.startDate === period.endDate) {
    return period.startDate;
  }

  return `${period.startDate || "debut inconnu"} au ${period.endDate || "fin inconnue"}`;
}

export default function Dashboard() {
  const { importsByYear } = useAnalysisStore();
  const activeImport = getActiveImport(importsByYear);
  const kpis = getKpis(activeImport);
  const globalKpis = getGlobalKpis(activeImport);
  const daily = activeImport?.parsed?.dailyClients || [];
  const importedYear = activeImport?.year || "aucune annee importee";
  const scope = activeImport?.parsed?.scope || "Aucun import";

  const cards = [
    { label: "Clients totaux", value: globalKpis.clientsCount, trend: "Tous tickets", tone: "good" },
    { label: "Clients OPE / remises", value: kpis.clientsCount, trend: scope, tone: "good" },
    { label: "Midi analyse", value: kpis.lunchClients, trend: `${kpis.clientsCount ? Math.round((kpis.lunchClients / kpis.clientsCount) * 100) : 0}% du perimetre` },
    { label: "Soir analyse", value: kpis.dinnerClients, trend: `${kpis.clientsCount ? Math.round((kpis.dinnerClients / kpis.clientsCount) * 100) : 0}% du perimetre` },
    { label: "Qt remises", value: kpis.discountsQuantity || 0, trend: formatCurrency(kpis.discountAmount || 0) },
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Periode analysee: OPE Juillet Arras - {importedYear}</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">Focus clients midi, soir et total</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Plage analysee: {periodLabel(activeImport)}. Clients totaux = tous tickets. Clients OPE/remises = perimetre {scope}.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="glass-panel rounded-lg p-5">
          <div className="mb-4">
            <p className="text-sm font-black uppercase text-brand">Detail par jour</p>
            <h2 className="text-xl font-black">Clients par jour de la semaine</h2>
          </div>
          <RevenueChart data={daily} />
        </article>
        <article className="glass-panel rounded-lg p-5">
          <p className="text-sm font-black uppercase text-brand">Midi / Soir</p>
          <h2 className="mt-1 text-xl font-black">Repartition clients</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Midi</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: {kpis.lunchClients} / {kpis.clientsCount} - Tickets: {kpis.lunchTickets || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Soir</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: {kpis.dinnerClients} / {kpis.clientsCount} - Tickets: {kpis.dinnerTickets || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
              <strong className="text-lg">Total</strong>
              <p className="mt-2 text-sm font-bold text-slate-200">
                Clients perimetre: {kpis.clientsCount} - Clients totaux: {globalKpis.clientsCount} - Tickets perimetre: {kpis.ticketsCount} - Qt remises: {kpis.discountsQuantity || 0}
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
