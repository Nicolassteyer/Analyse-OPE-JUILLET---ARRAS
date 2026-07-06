export default function Comparatif() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Comparatif</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Clients 2025 vers 2026</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Comparaison prevue sur la meme plage OPE Juillet Arras: clients total, clients midi, clients soir, puis tickets et CA en lecture secondaire.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {["Clients total", "Clients midi", "Clients soir", "Tickets"].map((label) => (
          <article key={label} className="glass-panel rounded-lg p-5">
            <p className="text-sm font-bold text-muted">Difference {label}</p>
            <strong className="mt-3 block text-3xl font-black text-emerald-700">+12%</strong>
          </article>
        ))}
      </section>
    </div>
  );
}
