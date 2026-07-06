const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) {
    throw new Error("API indisponible");
  }
  return response.json();
}
