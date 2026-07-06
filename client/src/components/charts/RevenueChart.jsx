import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { day: "Lun", ca: 1840 },
  { day: "Mar", ca: 2160 },
  { day: "Mer", ca: 1980 },
  { day: "Jeu", ca: 2403 },
  { day: "Ven", ca: 2680 },
  { day: "Sam", ca: 2940 },
  { day: "Dim", ca: 2260 },
];

export function RevenueChart() {
  return (
    <div className="h-80 rounded-lg border border-slate-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 18, bottom: 0 }}>
          <defs>
            <linearGradient id="ca" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [`${value} EUR`, "CA"]} />
          <Area type="monotone" dataKey="ca" stroke="#0f766e" strokeWidth={3} fill="url(#ca)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
