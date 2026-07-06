import { RevenueChart } from "../components/charts/RevenueChart.jsx";
import { KpiCard } from "../components/dashboard/KpiCard.jsx";

const kpis = [
  { label: "Remises", value: "75", trend: "+8%" },
  { label: "Clients", value: "184", trend: "+14%", tone: "good" },
  { label: "CA concerne", value: "2 403 EUR", trend: "+11%", tone: "good" },
  { label: "Montant remise", value: "1 072 EUR", trend: "-3%", tone: "warn" },
  { label: "Tickets", value: "61", trend: "+6%" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Pilotage general</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">Dashboard operationnel</h1>
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
              <p className="text-sm font-black uppercase text-brand">Evolution</p>
              <h2 className="text-xl font-black">Evolution du CA</h2>
            </div>
          </div>
          <RevenueChart />
        </article>
        <article className="glass-panel rounded-lg p-5">
          <p className="text-sm font-black uppercase text-brand">Midi / Soir</p>
          <h2 className="mt-1 text-xl font-black">Repartition service</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Midi</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: 96 · Tickets: 33 · CA: 1 280 EUR</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <strong className="text-lg">Soir</strong>
              <p className="mt-2 text-sm font-bold text-muted">Clients: 88 · Tickets: 28 · CA: 1 123 EUR</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
