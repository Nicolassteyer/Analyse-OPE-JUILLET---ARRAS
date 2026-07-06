
const € = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n||0));
const num = n => new Intl.NumberFormat('fr-FR').format(Number(n||0));
const pct = n => n === null || n === undefined ? '—' : `${num(n)} %`;

const kpiDefs = [
  ['nombreRemises','Nombre de remises','Qt / nombre d’articles',num],
  ['montantRemise','Montant remisé','Remise totale',€],
  ['caConcerne','CA concerné','Total TTC tickets avec remise',€],
  ['clientsConcernes','Clients concernés','Couverts détectés',num],
  ['ticketsConcernes','Tickets concernés','Tickets contenant l’OPE',num],
  ['panierMoyen','Panier moyen','CA / ticket concerné',€],
  ['caMoyenClient','CA moyen client','CA / client',€],
  ['tauxRemise','Taux remise estimé','Remise / CA avant remise',v=>`${num(v)} %`],
  ['remiseMoyenne','Remise moyenne','Montant moyen par remise',€],
];

let state = null;

async function api(){
  const r = await fetch('/api/dashboard');
  state = await r.json();
  render();
}

async function upload(year, form){
  const msg = document.querySelector('#message');
  msg.className = 'message';
  msg.textContent = `Import ${year} en cours...`;
  const fd = new FormData(form);
  const r = await fetch(`/api/upload/${year}`, {method:'POST', body:fd});
  const data = await r.json();
  if(!r.ok){ msg.className='message error'; msg.textContent=data.error || 'Erreur import'; return; }
  msg.textContent = `HTML ${year} analysé et sauvegardé.`;
  form.reset();
  await api();
}

function render(){
  const y26 = state.y2026;
  document.querySelector('#meta2026').textContent = y26 ? `Période ${y26.period || '—'} · MAJ ${new Date(y26.importedAt).toLocaleString('fr-FR')}` : 'Aucune donnée 2026';
  document.querySelector('#kpis').innerHTML = kpiDefs.map(([key,title,sub,fmt])=>{
    const val = y26?.kpis?.[key] ?? 0;
    return `<article class="kpi"><span>${title}</span><strong>${fmt(val)}</strong><small>${sub}</small></article>`;
  }).join('');

  const c = state.comparison || {};
  const rows = [
    ['Clients total', c.clientsTotal],
    ['Clients midi', c.clientsMidi],
    ['Clients soir', c.clientsSoir],
  ];
  document.querySelector('#compareRows').innerHTML = rows.map(([label,o]) => row(label,o)).join('');

  const serviceRows = [];
  for (const [year, data] of [['2026', state.y2026], ['2025', state.y2025]]) {
    for (const svc of ['midi','soir','inconnu']) {
      const s = data?.services?.[svc];
      if (!s) continue;
      serviceRows.push(`<tr><td>${year}</td><td>${svc}</td><td>${num(s.clients)}</td><td>${num(s.tickets)}</td><td>${€(s.ca)}</td></tr>`);
    }
  }
  document.querySelector('#serviceRows').innerHTML = serviceRows.join('') || `<tr><td colspan="5">Aucune donnée</td></tr>`;

  drawBar('barChart', [
    ['Total', c.clientsTotal?.v2026||0, c.clientsTotal?.v2025||0],
    ['Midi', c.clientsMidi?.v2026||0, c.clientsMidi?.v2025||0],
    ['Soir', c.clientsSoir?.v2026||0, c.clientsSoir?.v2025||0],
  ]);
  drawDonut('donut2026', y26?.services?.midi?.clients||0, y26?.services?.soir?.clients||0);
}

function row(label,o={}){
  const cls = o.ecart > 0 ? 'positive' : o.ecart < 0 ? 'negative' : 'neutral';
  return `<tr><td>${label}</td><td>${num(o.v2026)}</td><td>${num(o.v2025)}</td><td class="${cls}">${o.ecart>0?'+':''}${num(o.ecart)}</td><td class="${cls}">${pct(o.pct)}</td></tr>`;
}

function setup(){
  document.querySelector('#form2026').addEventListener('submit', e=>{e.preventDefault(); upload('2026', e.currentTarget)});
  document.querySelector('#form2025').addEventListener('submit', e=>{e.preventDefault(); upload('2025', e.currentTarget)});
  api();
}

function drawBar(id, data){
  const canvas = document.getElementById(id), ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.height;
  canvas.width = w*dpr; canvas.height = h*dpr; ctx.scale(dpr,dpr); ctx.clearRect(0,0,w,h);
  const max = Math.max(1, ...data.flatMap(x=>[x[1],x[2]]));
  ctx.font='700 12px system-ui'; ctx.fillStyle='#667085';
  const groupW = w / data.length;
  data.forEach((d,i)=>{
    const x = i*groupW + 36, bw = Math.min(42, groupW/5);
    const h26 = (d[1]/max)*(h-62), h25 = (d[2]/max)*(h-62);
    ctx.fillStyle='#ef3f46'; roundRect(ctx,x,h-34-h26,bw,h26,8); ctx.fill();
    ctx.fillStyle='#1d4ed8'; roundRect(ctx,x+bw+10,h-34-h25,bw,h25,8); ctx.fill();
    ctx.fillStyle='#667085'; ctx.fillText(d[0], x, h-10);
    ctx.fillStyle='#101828'; ctx.fillText(String(d[1]), x, h-42-h26);
    ctx.fillText(String(d[2]), x+bw+10, h-42-h25);
  });
  ctx.fillStyle='#ef3f46'; ctx.fillRect(w-150,10,12,12); ctx.fillStyle='#667085'; ctx.fillText('2026',w-132,21);
  ctx.fillStyle='#1d4ed8'; ctx.fillRect(w-88,10,12,12); ctx.fillStyle='#667085'; ctx.fillText('2025',w-70,21);
}
function drawDonut(id, midi, soir){
  const canvas = document.getElementById(id), ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.height;
  canvas.width = w*dpr; canvas.height = h*dpr; ctx.scale(dpr,dpr); ctx.clearRect(0,0,w,h);
  const total = midi + soir; const cx=w/2, cy=h/2, r=Math.min(w,h)/2-18;
  ctx.lineWidth = 34; ctx.lineCap='round';
  ctx.strokeStyle='#e6eaf0'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  if(total){
    const a = (midi/total)*Math.PI*2;
    ctx.strokeStyle='#ef3f46'; ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+a); ctx.stroke();
    ctx.strokeStyle='#1d4ed8'; ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2+a,-Math.PI/2+Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle='#101828'; ctx.font='900 30px system-ui'; ctx.textAlign='center'; ctx.fillText(num(total),cx,cy+5);
  ctx.font='800 13px system-ui'; ctx.fillStyle='#667085'; ctx.fillText('clients 2026',cx,cy+28);
  ctx.textAlign='left';
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
setup();
