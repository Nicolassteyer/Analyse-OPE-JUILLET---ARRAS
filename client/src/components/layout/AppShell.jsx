import { BarChart3, GitCompare, Inbox, LayoutDashboard, Settings, Ticket, UserCircle } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/comparatif", label: "Comparatif", icon: GitCompare },
  { to: "/imports", label: "Imports", icon: Inbox },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/settings", label: "Parametres", icon: Settings },
];

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-sm font-black text-white">FA</div>
            <div>
              <p className="text-sm font-black text-ink">FLAMS Analytics PRO</p>
              <p className="text-xs font-semibold text-muted">OPE Juillet Arras</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            <UserCircle size={18} />
            Admin
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
