import { getKpis, useAnalysisStore } from "../hooks/useAnalysisStore.jsx";
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

export default function Comparatif() {
  const { importsByYear } = useAnalysisStore();
  const kpis2025 = getKpis(importsByYear[2025]);
  const kpis2026 = getKpis(importsByYear[2026]);

  const rows = [
    { label: "Clients total", current: kpis2026.clientsCount, previous: kpis2025.clientsCount },
    { label: "Clients midi", current: kpis2026.lunchClients, previous: kpis2025.lunchClients },
    { label: "Clients soir", current: kpis2026.dinnerClients, previous: kpis2025.dinnerClients },
    { label: "Tickets", current: kpis2026.ticketsCount, previous: kpis2025.ticketsCount },
    { label: "CA indicatif", current: kpis2026.revenueConcerned, previous: kpis2025.revenueConcerned, currency: true },
  ].map((row) => ({ ...row, ...diff(row.current, row.previous) }));

  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => {
    const current = importsByYear[2026]?.parsed?.dailyClients?.find((item) => item.day === day)?.clients || 0;
    const previous = importsByYear[2025]?.parsed?.dailyClients?.find((item) => item.day === day)?.clients || 0;
    return { day, current, previous, ...diff(current, previous) };
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Comparatif</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Clients 2025 vers 2026</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Comparaison sur OPE Juillet Arras avec quantites, ecarts chiffres et pourcentages. Importe les deux annees pour obtenir un comparatif complet.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <article key={row.label} className="glass-panel rounded-lg p-5">
            <p className="text-sm font-bold text-muted">{row.label}</p>
            <strong className="mt-3 block text-3xl font-black text-slate-950">{row.currency ? formatCurrency(row.current) : row.current}</strong>
            <p className="mt-2 text-sm font-black text-emerald-700">
              {formatDelta(row.delta, row.currency ? formatCurrency : (value) => value)} {row.percent === null ? "" : `(${formatDelta(Math.round(row.percent))}%)`}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted">2025: {row.currency ? formatCurrency(row.previous) : row.previous}</p>
          </article>
        ))}
      </section>
      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Detail clients par jour de la semaine</h2>
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
