
let totalsChart, ticketsChart;
const euro = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const num = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
function setStatus(msg, ok=true){const s=document.getElementById('status');s.textContent=msg;s.style.borderColor=ok?'#cfe8d9':'#ffd1d1';}
function val(id, v, fmt='num'){document.getElementById(id).textContent = fmt==='euro'?euro.format(v||0):fmt==='pct'?num.format(v||0)+' %':num.format(v||0);}
function render(data){
  const k=data.kpis;
  val('discountQty',k.discountQty); val('discountAmount',k.discountAmount,'euro'); val('caTickets',k.caTickets,'euro'); val('clients',k.clients);
  val('ticketsWithDiscount',k.ticketsWithDiscount); val('avgTicket',k.avgTicket,'euro'); val('avgClient',k.avgClient,'euro'); val('discountRate',k.discountRate,'pct');
  document.getElementById('period').textContent=data.period||'Non détectée';
  document.getElementById('importedAt').textContent=data.importedAt?new Date(data.importedAt).toLocaleString('fr-FR'):'—';
  totalsChart?.destroy(); ticketsChart?.destroy();
  totalsChart=new Chart(document.getElementById('totalsChart'),{type:'doughnut',data:{labels:data.charts.totals.map(x=>x.label),datasets:[{data:data.charts.totals.map(x=>x.value)}]}});
  const rows=(data.charts.distributionTickets||[]).slice(0,80);
  ticketsChart=new Chart(document.getElementById('ticketsChart'),{type:'bar',data:{labels:rows.map(x=>'T'+x.ticket),datasets:[{label:'CA',data:rows.map(x=>x.ca)}]},options:{scales:{y:{beginAtZero:true}}}});
  setStatus('Rapport sauvegardé chargé. Ces données sont visibles par toutes les personnes ayant le lien.');
}
async function load(){
  const res=await fetch('/api/report');
  if(!res.ok){setStatus("Aucun fichier HTML sauvegardé pour l'instant. Importe ton rapport.",false);return;}
  render(await res.json());
}
document.getElementById('uploadForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const file=document.getElementById('file').files[0];
  const fd=new FormData(); fd.append('file',file);
  setStatus('Import et sauvegarde en cours…');
  const res=await fetch('/api/upload',{method:'POST',body:fd});
  if(!res.ok){setStatus("Erreur pendant l'import.",false);return;}
  render(await res.json());
});
load();
