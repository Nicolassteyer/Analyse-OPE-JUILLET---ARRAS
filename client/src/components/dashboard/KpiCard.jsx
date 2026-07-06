export function KpiCard({ label, value, trend, tone = "default" }) {
  const tones = {
    default: "text-slate-950",
    good: "text-emerald-700",
    warn: "text-orange-700"
  };

  return (
    <article className="glass-panel rounded-lg p-5">
      <p className="text-sm font-bold text-muted">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className={`text-3xl font-black ${tones[tone]}`}>{value}</strong>
        {trend ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{trend}</span> : null}
      </div>
    </article>
  );
}
