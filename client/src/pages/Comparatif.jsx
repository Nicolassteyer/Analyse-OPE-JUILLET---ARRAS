import { getGlobalKpis, getKpis, useAnalysisStore } from "../hooks/useAnalysisStore.jsx";
import { formatCurrency } from "../utils/formatters.js";

function diff(current, previous) {
  const delta = current - previous;
  const percent = previous ? (delta / previous) * 100 : null;
  return { delta, percent };
}

function formatDelta(value, formatter = (item) => item) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatter(value)}`;
}

function findDay(importResult, day, field = "allTicketsDailyClients") {
  return importResult?.parsed?.[field]?.find((item) => item.day === day)?.clients || 0;
}

export default function Comparatif() {
  const { importsByYear } = useAnalysisStore();
  const global2025 = getGlobalKpis(importsByYear[2025]);
  const global2026 = getGlobalKpis(importsByYear[2026]);
  const ope2026 = getKpis(importsByYear[2026]);
  const scope2026 = importsByYear[2026]?.parsed?.scope || "Non importe";

  const rows = [
    { label: "Clients total", current: global2026.clientsCount, previous: global2025.clientsCount },
    { label: "Clients midi", current: global2026.lunchClients, previous: global2025.lunchClients },
    { label: "Clients soir", current: global2026.dinnerClients, previous: global2025.dinnerClients },
    { label: "Tickets", current: global2026.ticketsCount, previous: global2025.ticketsCount },
    { label: "CA global", current: global2026.revenueConcerned, previous: global2025.revenueConcerned, currency: true },
  ].map((row) => ({ ...row, ...diff(row.current, row.previous) }));

  const opeRows = [
    { label: "Clients OPE 2026", value: ope2026.clientsCount },
    { label: "Midi OPE 2026", value: ope2026.lunchClients },
    { label: "Soir OPE 2026", value: ope2026.dinnerClients },
    { label: "Tickets OPE 2026", value: ope2026.ticketsCount },
    { label: "Qt remises OPE", value: ope2026.discountsQuantity || 0 },
    { label: "Montant remises OPE", value: formatCurrency(ope2026.discountAmount || 0) },
  ];

  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => {
    const current = findDay(importsByYear[2026], day);
    const previous = findDay(importsByYear[2025], day);
    return { day, current, previous, ...diff(current, previous) };
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Comparatif</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Clients globaux 2025 vers 2026</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Les clients 2025/2026 sont compares sur le global tous tickets. Le focus OPE 2026 est affiche separement pour ne pas melanger les perimetres.
        </p>
        <p className="mt-2 text-sm font-black text-slate-700">Comparatif clients: Tous tickets / Focus 2026: {scope2026}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <article key={row.label} className="glass-panel rounded-lg p-5">
            <p className="text-sm font-bold text-muted">{row.label}</p>
            <strong className="mt-3 block text-3xl font-black text-slate-950">{row.currency ? formatCurrency(row.current) : row.current}</strong>
            <p className={`mt-2 text-sm font-black ${row.delta >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
              {formatDelta(row.delta, row.currency ? formatCurrency : (value) => value)} {row.percent === null ? "" : `(${formatDelta(Math.round(row.percent))}%)`}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted">2025: {row.currency ? formatCurrency(row.previous) : row.previous}</p>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Focus operation 2026</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {opeRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-black text-muted">{row.label}</p>
              <strong className="mt-2 block text-2xl font-black text-slate-950">{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Detail clients globaux par jour de la semaine</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-5 gap-3 bg-slate-50 px-4 py-3 text-sm font-black text-muted">
            <span>Jour</span>
            <span>2025</span>
            <span>2026</span>
            <span>Ecart</span>
            <span>%</span>
          </div>
          {days.map((day) => (
            <div key={day.day} className="grid grid-cols-5 gap-3 border-t border-slate-100 px-4 py-3 text-sm font-bold">
              <span>{day.day}</span>
              <span>{day.previous}</span>
              <span>{day.current}</span>
              <span className={day.delta >= 0 ? "text-emerald-700" : "text-orange-700"}>{formatDelta(day.delta)}</span>
              <span>{day.percent === null ? "n/a" : `${formatDelta(Math.round(day.percent))}%`}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
