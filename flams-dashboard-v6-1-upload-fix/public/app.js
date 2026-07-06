
const $ = (id) => document.getElementById(id);
const fmtInt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)||0));
const fmtMoney = (n) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const fmtPct = (n) => `${(Number(n)||0).toLocaleString('fr-FR',{maximumFractionDigits:1})} %`;

let state = { years: { "2025": null, "2026": null } };

async function apiData(){
  const r = await fetch('/api/data', {cache:'no-store'});
  state = await r.json();
  render();
}

async function uploadYear(year){
  const input = $(`file${year}`);
  const file = input.files && input.files[0];
  if(!file){ setStatus(`Choisis un fichier HTML ${year}.`); return; }
  if(!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')){
    setStatus(`Le fichier ${year} doit être un fichier .html`);
    return;
  }
  setStatus(`Import ${year} en cours...`);
  const content = await file.text();
  const r = await fetch(`/api/upload/${year}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({filename:file.name, content})
  });
  const data = await r.json();
  if(!r.ok || data.error){ setStatus(`Erreur ${year}: ${data.error || 'upload impossible'}`); return; }
  state = data.state;
  setStatus(`Fichier ${year} sauvegardé et analysé.`);
  render();
}

function setStatus(t){ $('status').textContent = t; }

function y(year){ return (state.years && state.years[year]) || null; }
function totalClients(d){ return d ? d.clientsConcerned : 0; }
function delta(a,b){ return (a||0) - (b||0); }
function deltaPct(a,b){ return b ? ((a-b)/b)*100 : (a ? 100 : 0); }

function renderKpis(){
  const d = y('2026') || y('2025') || {};
  const kpis = [
    ['Nombre de remises', fmtInt(d.discountsCount), 'Qt / Nombre d’articles'],
    ['Montant remisé', fmtMoney(d.discountAmount), 'Remise totale'],
    ['CA concerné', fmtMoney(d.caConcerned), 'Total TTC tickets avec remise'],
    ['Clients concernés', fmtInt(d.clientsConcerned), 'Couverts détectés'],
    ['Tickets concernés', fmtInt(d.ticketsConcerned), 'Tickets contenant l’OPE'],
    ['Panier moyen', fmtMoney(d.avgBasket), 'CA / ticket concerné'],
    ['CA moyen client', fmtMoney(d.avgCAClient), 'CA / client'],
    ['Taux remise estimé', fmtPct(d.estimatedDiscountRate), 'Remise / CA avant remise'],
  ];
  $('kpis').innerHTML = kpis.map(k=>`<div class="kpi"><strong>${k[0]}</strong><div class="value">${k[1]}</div><small>${k[2]}</small></div>`).join('');
  $('period').textContent = d.period || '—';
  $('updated').textContent = d.importedAt ? new Date(d.importedAt).toLocaleString('fr-FR') : '—';
}

function renderCompare(){
  const a = y('2026'), b = y('2025');
  const c26 = totalClients(a), c25 = totalClients(b);
  const midi26 = a?.services?.midi?.clients || 0, midi25 = b?.services?.midi?.clients || 0;
  const soir26 = a?.services?.soir?.clients || 0, soir25 = b?.services?.soir?.clients || 0;
  const rows = [
    ['Clients total', c26, c25],
    ['Clients midi', midi26, midi25],
    ['Clients soir', soir26, soir25],
  ];
  $('compareCards').innerHTML = rows.map(([label,v26,v25])=>{
    const d = delta(v26,v25), p = deltaPct(v26,v25);
    return `<div class="compare-card">
      <h3>${label}</h3>
      <div class="bigdelta ${d>=0?'good':'bad'}">${d>=0?'+':''}${fmtInt(d)}</div>
      <div><b>2026:</b> ${fmtInt(v26)} · <b>2025:</b> ${fmtInt(v25)}</div>
      <div style="color:#64748b;margin-top:8px">${p>=0?'+':''}${fmtPct(p)} vs 2025</div>
    </div>`;
  }).join('');

  $('compareTable').innerHTML = `<table><thead><tr><th>Service</th><th>Clients 2026</th><th>Clients 2025</th><th>Écart</th><th>Écart %</th></tr></thead><tbody>${
    rows.map(([label,v26,v25])=>`<tr><td><b>${label}</b></td><td>${fmtInt(v26)}</td><td>${fmtInt(v25)}</td><td class="${delta(v26,v25)>=0?'good':'bad'}">${delta(v26,v25)>=0?'+':''}${fmtInt(delta(v26,v25))}</td><td>${deltaPct(v26,v25)>=0?'+':''}${fmtPct(deltaPct(v26,v25))}</td></tr>`).join('')
  }</tbody></table>`;
}

function drawBarChart(canvasId, labels, data2026, data2025){
  const canvas=$(canvasId), ctx=canvas.getContext('2d');
  const rect=canvas.parentElement.getBoundingClientRect();
  canvas.width=rect.width*devicePixelRatio; canvas.height=rect.height*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  const w=rect.width,h=rect.height,pad=42,max=Math.max(1,...data2026,...data2025)*1.2;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1; ctx.font='12px Inter, Arial'; ctx.fillStyle='#64748b';
  for(let i=0;i<=4;i++){const y=pad+(h-pad*1.5-pad)*i/4; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); ctx.fillText(fmtInt(max*(1-i/4)),8,y+4);}
  const groupW=(w-pad*2)/labels.length, bw=Math.min(46, groupW/4);
  labels.forEach((lab,i)=>{
    const x=pad+i*groupW+groupW/2;
    const y26=h-pad-(data2026[i]/max)*(h-pad*2);
    const y25=h-pad-(data2025[i]/max)*(h-pad*2);
    ctx.fillStyle='#ef4444'; roundRect(ctx,x-bw-3,y26,bw,h-pad-y26,8,true);
    ctx.fillStyle='#2563eb'; roundRect(ctx,x+3,y25,bw,h-pad-y25,8,true);
    ctx.fillStyle='#0f172a'; ctx.textAlign='center'; ctx.fillText(lab,x,h-14);
  });
  ctx.textAlign='left'; ctx.fillStyle='#ef4444'; ctx.fillText('■ 2026',pad,18); ctx.fillStyle='#2563eb'; ctx.fillText('■ 2025',pad+70,18);
}
function roundRect(ctx,x,y,w,h,r,fill){ if(h<1)h=1; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); if(fill) ctx.fill(); }

function drawDonut(canvasId, d){
  const canvas=$(canvasId), ctx=canvas.getContext('2d');
  const rect=canvas.parentElement.getBoundingClientRect();
  canvas.width=rect.width*devicePixelRatio; canvas.height=rect.height*devicePixelRatio;
  ctx.scale(devicePixelRatio,devicePixelRatio);
  const w=rect.width,h=rect.height,cx=w/2,cy=h/2,r=Math.min(w,h)/2-28;
  ctx.clearRect(0,0,w,h);
  const ca=d?.caConcerned||0, rem=d?.discountAmount||0, total=Math.max(1,ca+rem);
  let start=-Math.PI/2;
  [[ca,'#111827'],[rem,'#ef4444']].forEach(([val,col])=>{
    const end=start+(val/total)*Math.PI*2;
    ctx.beginPath(); ctx.strokeStyle=col; ctx.lineWidth=34; ctx.arc(cx,cy,r,start,end); ctx.stroke(); start=end;
  });
  ctx.fillStyle='#0f172a'; ctx.font='900 24px Inter,Arial'; ctx.textAlign='center'; ctx.fillText(fmtPct((rem/total)*100),cx,cy-4);
  ctx.font='700 13px Inter,Arial'; ctx.fillStyle='#64748b'; ctx.fillText('taux remise',cx,cy+22);
}

function renderTickets(){
  const d = y('2026') || y('2025');
  const tickets = (d?.tickets || []).slice(0,80);
  $('tickets').innerHTML = tickets.length ? `<table><thead><tr><th>Table</th><th>Note</th><th>Service</th><th>Clients</th><th>Remises</th><th>Montant</th><th>CA</th></tr></thead><tbody>${
    tickets.map(t=>`<tr><td>${t.table}</td><td>${t.note}</td><td>${t.service}</td><td>${fmtInt(t.clients)}</td><td>${fmtInt(t.discountsCount)}</td><td>${fmtMoney(t.discountAmount)}</td><td>${fmtMoney(t.caConcerned)}</td></tr>`).join('')
  }</tbody></table>` : `<div class="empty">Importe un fichier HTML 2026 ou 2025 pour afficher les tickets détectés.</div>`;
}

function render(){
  renderKpis();
  renderCompare();
  renderTickets();
  const d26=y('2026'), d25=y('2025');
  drawBarChart('serviceChart', ['Total','Midi','Soir'], [d26?.clientsConcerned||0,d26?.services?.midi?.clients||0,d26?.services?.soir?.clients||0], [d25?.clientsConcerned||0,d25?.services?.midi?.clients||0,d25?.services?.soir?.clients||0]);
  drawDonut('donutChart', d26 || d25 || {});
  $('link2026').href='/saved/2026.html';
  $('link2025').href='/saved/2025.html';
}

window.addEventListener('DOMContentLoaded', ()=>{
  $('upload2026').addEventListener('click', ()=>uploadYear('2026'));
  $('upload2025').addEventListener('click', ()=>uploadYear('2025'));
  apiData().catch(e=>setStatus('Erreur chargement données: '+e.message));
});
window.addEventListener('resize', ()=>render());
