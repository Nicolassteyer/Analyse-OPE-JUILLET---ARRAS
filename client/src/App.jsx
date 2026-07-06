import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Imports from "./pages/Imports.jsx";
import Comparatif from "./pages/Comparatif.jsx";
import Tickets from "./pages/Tickets.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/imports" element={<Imports />} />
        <Route path="/comparatif" element={<Comparatif />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  );
}
