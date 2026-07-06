let serviceChart;
let ticketsChart;

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function setStatus(message, type = 'ok') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `alert ${type}`;
}

function setValue(id, value, format = 'num') {
  const el = document.getElementById(id);
  if (!el) return;
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (format === 'euro') el.textContent = euro.format(safe);
  else if (format === 'pct') el.textContent = `${num.format(safe)} %`;
  else el.textContent = num.format(safe);
}

function fmtPct(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A';
  return `${num.format(value)} %`;
}

function signed(value) {
  const v = Number(value || 0);
  return `${v > 0 ? '+' : ''}${num.format(v)}`;
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '—';
}

function applyChartTheme() {
  if (!window.Chart) return;
  Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif';
  Chart.defaults.color = '#667085';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

function renderBase2026(report) {
  const data2026 = report.years?.['2026'] || {};
  const k = data2026.kpis || {};
  setValue('discountQty2026', k.discountQty);
  setValue('discountAmount2026', k.discountAmount, 'euro');
  setValue('caTickets2026', k.caTickets, 'euro');
  setValue('clients2026', k.clients);
  setValue('ticketsWithDiscount2026', k.ticketsWithDiscount);
  setValue('avgTicket2026', k.avgTicket, 'euro');
  setValue('avgClient2026', k.avgClient, 'euro');
  setValue('discountRate2026', k.discountRate, 'pct');

  document.getElementById('period2026').textContent = data2026.period || '—';
  document.getElementById('importedAt2026').textContent = dateLabel(data2026.importedAt);

  const data2025 = report.years?.['2025'] || {};
  document.getElementById('period2025').textContent = data2025.period || '—';
  document.getElementById('importedAt2025').textContent = dateLabel(data2025.importedAt);
}

function renderComparison(report) {
  const c = report.comparison?.clients || {};
  setValue('totalClients2026', c.total2026);
  setValue('totalClients2025', c.total2025);
  document.getElementById('totalDelta').textContent = signed(c.delta);
  document.getElementById('totalDeltaPct').textContent = fmtPct(c.deltaPct);
  document.getElementById('totalDeltaLabel').textContent = `${signed(c.delta)} client(s) vs 2025`;

  const tbody = document.getElementById('serviceRows');
  tbody.innerHTML = '';
  for (const row of c.byService || []) {
    const tr = document.createElement('tr');
    const trendClass = row.delta > 0 ? 'positive' : row.delta < 0 ? 'negative' : 'neutral';
    tr.innerHTML = `
      <td><strong>${row.service}</strong></td>
      <td>${num.format(row.clients2026 || 0)}</td>
      <td>${num.format(row.clients2025 || 0)}</td>
      <td class="${trendClass}">${signed(row.delta)}</td>
      <td class="${trendClass}">${fmtPct(row.deltaPct)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderCharts(report) {
  if (!window.Chart) {
    setStatus('Données chargées. Les graphiques ne peuvent pas être affichés car Chart.js ne charge pas.', 'ok');
    return;
  }

  serviceChart?.destroy();
  ticketsChart?.destroy();
  applyChartTheme();

  const services = report.comparison?.clients?.byService || [];
  serviceChart = new Chart(document.getElementById('serviceChart'), {
    type: 'bar',
    data: {
      labels: services.map(x => x.service),
      datasets: [
        { label: 'Clients 2026', data: services.map(x => x.clients2026), borderRadius: 10, maxBarThickness: 42 },
        { label: 'Clients 2025', data: services.map(x => x.clients2025), borderRadius: 10, maxBarThickness: 42 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: '#eef2f7' } },
        x: { grid: { display: false } }
      }
    }
  });

  const rows = (report.years?.['2026']?.charts?.distributionTickets || []).filter(x => Number(x.ca) > 0).slice(0, 45);
  ticketsChart = new Chart(document.getElementById('ticketsChart'), {
    type: 'bar',
    data: {
      labels: rows.map(x => `T${x.ticket}`),
      datasets: [{ label: 'CA ticket 2026', data: rows.map(x => x.ca), borderRadius: 10, maxBarThickness: 30 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { callback: v => euro.format(v) } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `CA: ${euro.format(ctx.raw || 0)}` } }
      }
    }
  });
}

function render(report) {
  renderBase2026(report);
  renderComparison(report);
  renderCharts(report);

  const has2026 = !!report.years?.['2026']?.importedAt;
  const has2025 = !!report.years?.['2025']?.importedAt;
  if (has2026 && has2025) setStatus('Rapports 2026 et 2025 chargés. Comparatif disponible.', 'ok');
  else if (has2026) setStatus('Rapport 2026 chargé. Importe le HTML 2025 pour activer le comparatif.', 'ok');
  else if (has2025) setStatus('Rapport 2025 chargé. Importe le HTML 2026 pour compléter le dashboard.', 'ok');
  else setStatus("Aucun HTML sauvegardé. Importe les rapports 2026 et 2025.", 'error');
}

async function load() {
  try {
    const res = await fetch('/api/report');
    if (!res.ok) {
      setStatus("Impossible de charger les rapports.", 'error');
      return;
    }
    render(await res.json());
  } catch {
    setStatus("Impossible de charger les rapports. Vérifie que le serveur est bien lancé.", 'error');
  }
}

function bindUploader(year) {
  const fileInput = document.getElementById(`file${year}`);
  const fileName = document.getElementById(`fileName${year}`);
  const form = document.getElementById(`uploadForm${year}`);

  fileInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    fileName.textContent = file ? file.name : `Choisir le fichier HTML ${year}`;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    setStatus(`Import, analyse et sauvegarde du rapport ${year} en cours…`, 'loading');

    try {
      const res = await fetch(`/api/upload/${year}`, { method: 'POST', body: fd });
      if (!res.ok) {
        setStatus(`Erreur pendant l'import du fichier HTML ${year}.`, 'error');
        return;
      }
      render(await res.json());
    } catch {
      setStatus(`Erreur réseau pendant l'import ${year}.`, 'error');
    }
  });
}

bindUploader('2026');
bindUploader('2025');
load();
