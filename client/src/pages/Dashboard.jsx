import { RevenueChart } from "../components/charts/RevenueChart.jsx";
import { KpiCard } from "../components/dashboard/KpiCard.jsx";

const kpis = [
  { label: "Clients total", value: "184", trend: "Midi + Soir", tone: "good" },
  { label: "Clients midi", value: "96", trend: "52% du total", tone: "good" },
  { label: "Clients soir", value: "88", trend: "48% du total" },
  { label: "Tickets total", value: "61", trend: "Base analysee" },
  { label: "Ticket moyen", value: "39 EUR", trend: "Repere CA" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Periode analysee: OPE Juillet Arras</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">Focus clients midi, soir et total</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Plage cible: exports FLAMS 2025 et 2026 de l'operation Juillet Arras. Les dates exactes seront affichees apres parsing des fichiers HTML importes.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="glass-panel rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase text-brand">Evolution clients</p>
              <h2 className="text-xl font-black">Clients par jour analyse</h2>
            </div>
          </div>
          <RevenueChart />
        </article>
        <article className="glass-panel rounded-lg p-5">
          <p className="text-sm font-black uppercase text-brand">Midi / Soir</p>
          <h2 className="mt-1 text-xl font-black">Repartition clients</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Midi</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: 96 / 184 - Tickets: 33 - CA indicatif: 1 280 EUR</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Soir</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: 88 / 184 - Tickets: 28 - CA indicatif: 1 123 EUR</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
              <strong className="text-lg">Total</strong>
              <p className="mt-2 text-sm font-bold text-slate-200">Clients: 184 - Tickets: 61 - CA indicatif: 2 403 EUR</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
