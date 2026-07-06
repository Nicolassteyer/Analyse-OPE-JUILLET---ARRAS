import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fallbackData = [
  { day: "Lun", clients: 0 },
  { day: "Mar", clients: 0 },
  { day: "Mer", clients: 0 },
  { day: "Jeu", clients: 0 },
  { day: "Ven", clients: 0 },
  { day: "Sam", clients: 0 },
  { day: "Dim", clients: 0 },
];

export function RevenueChart({ data = fallbackData }) {
  return (
    <div className="h-80 rounded-lg border border-slate-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 18, bottom: 0 }}>
          <defs>
            <linearGradient id="clients" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [value, "Clients"]} />
          <Area type="monotone" dataKey="clients" stroke="#0f766e" strokeWidth={3} fill="url(#clients)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
