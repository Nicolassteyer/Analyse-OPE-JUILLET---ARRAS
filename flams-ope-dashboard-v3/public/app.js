let totalsChart, ticketsChart;

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function setStatus(message, type = 'ok') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status ${type}`;
}

function setValue(id, value, format = 'num') {
  const el = document.getElementById(id);
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (format === 'euro') el.textContent = euro.format(safe);
  else if (format === 'pct') el.textContent = `${num.format(safe)} %`;
  else el.textContent = num.format(safe);
}

function chartDefaults() {
  Chart.defaults.font.family = 'Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif';
  Chart.defaults.color = '#64748b';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

function render(data) {
  const k = data.kpis || {};

  setValue('discountQty', k.discountQty);
  setValue('discountAmount', k.discountAmount, 'euro');
  setValue('caTickets', k.caTickets, 'euro');
  setValue('clients', k.clients);
  setValue('ticketsWithDiscount', k.ticketsWithDiscount);
  setValue('avgTicket', k.avgTicket, 'euro');
  setValue('avgClient', k.avgClient, 'euro');
  setValue('discountRate', k.discountRate, 'pct');

  document.getElementById('period').textContent = data.period || 'Non détectée';
  document.getElementById('importedAt').textContent = data.importedAt
    ? new Date(data.importedAt).toLocaleString('fr-FR')
    : '—';

  totalsChart?.destroy();
  ticketsChart?.destroy();
  chartDefaults();

  const totals = data.charts?.totals || [];
  totalsChart = new Chart(document.getElementById('totalsChart'), {
    type: 'doughnut',
    data: {
      labels: totals.map(x => x.label),
      datasets: [{
        data: totals.map(x => x.value),
        backgroundColor: ['#2563eb', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: { label: ctx => `${ctx.label}: ${euro.format(ctx.raw || 0)}` }
        }
      }
    }
  });

  const rows = (data.charts?.distributionTickets || [])
    .filter(x => Number(x.ca) > 0)
    .slice(0, 50);

  ticketsChart = new Chart(document.getElementById('ticketsChart'), {
    type: 'bar',
    data: {
      labels: rows.map(x => `T${x.ticket}`),
      datasets: [{
        label: 'CA ticket',
        data: rows.map(x => x.ca),
        backgroundColor: '#2563eb',
        borderRadius: 8,
        maxBarThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { callback: v => euro.format(v) } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `CA: ${euro.format(ctx.raw || 0)}` }
        }
      }
    }
  });

  setStatus('Rapport sauvegardé chargé. Ces données sont visibles par toutes les personnes ayant le lien.', 'ok');
}

async function load() {
  try {
    const res = await fetch('/api/report');
    if (!res.ok) {
      setStatus("Aucun fichier HTML sauvegardé pour l'instant. Importe ton rapport.", 'error');
      return;
    }
    render(await res.json());
  } catch {
    setStatus("Impossible de charger le rapport. Vérifie que le serveur est bien lancé.", 'error');
  }
}

document.getElementById('uploadForm').addEventListener('submit', async event => {
  event.preventDefault();

  const file = document.getElementById('file').files[0];
  if (!file) return;

  const fd = new FormData();
  fd.append('file', file);

  setStatus('Import, analyse et sauvegarde en cours…', 'ok');

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      setStatus("Erreur pendant l'import du fichier HTML.", 'error');
      return;
    }
    render(await res.json());
  } catch {
    setStatus("Erreur réseau pendant l'import.", 'error');
  }
});

load();
