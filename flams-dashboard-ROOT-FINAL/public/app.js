
let state=null;
const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n||0));
const num=n=>new Intl.NumberFormat('fr-FR').format(Math.round(Number(n||0)));
const pct=n=>n===null||n===undefined?'—':`${Number(n||0).toFixed(1).replace('.',',')} %`;
function setStatus(t){document.getElementById('status').textContent=t||''}
async function uploadYear(year){
  const input=document.getElementById('file'+year);
  const file=input.files&&input.files[0];
  if(!file){setStatus('Choisis un fichier HTML '+year);return}
  setStatus('Import '+year+' en cours...');
  const text=await file.text();
  const res=await fetch('/api/upload/'+year,{method:'POST',headers:{'Content-Type':'text/html; charset=utf-8'},body:text});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){setStatus(data.error||'Erreur import '+year);return}
  setStatus('HTML '+year+' sauvegardé et analysé.');
  await refreshData();
}
async function refreshData(){
  const res=await fetch('/api/data',{cache:'no-store'});
  state=await res.json();
  render();
}
function metric(title,value,sub){return `<div><p class="eyebrow">${title}</p><strong>${value}</strong><span>${sub}</span></div>`}
function render(){
 const y26=state['2026']||{}, y25=state['2025']||{}, c=state.comparison||{};
 document.getElementById('kpis').innerHTML=[
  metric('Clients 2026',num(y26.clients),'Total clients/couverts'),
  metric('Clients 2025',num(y25.clients),'Base comparaison'),
  metric('Écart clients',num(c.clientsDelta),(c.clientsDelta>=0?'+':'')+pct(c.clientsDeltaPct)),
  metric('Remises 2026',num(y26.remises),'Qt / nombre articles'),
  metric('Montant remisé 2026',euro(y26.montantRemise),'Remise totale'),
  metric('CA concerné 2026',euro(y26.ca),'Tickets avec remise'),
  metric('Tickets 2026',num(y26.ticketsConcernes),'Tickets concernés'),
  metric('Panier moyen 2026',euro(y26.panierMoyen),'CA / ticket')
 ].join('');
 const m26=y26.services?.midi?.clients||0,s26=y26.services?.soir?.clients||0,m25=y25.services?.midi?.clients||0,s25=y25.services?.soir?.clients||0;
 document.getElementById('compare').innerHTML=[
  `<div><span>Midi 2026</span><strong>${num(m26)}</strong><small>vs ${num(m25)} en 2025</small></div>`,
  `<div><span>Soir 2026</span><strong>${num(s26)}</strong><small>vs ${num(s25)} en 2025</small></div>`,
  `<div><span>Écart midi</span><strong>${num(c.midiDelta)}</strong><small>clients</small></div>`,
  `<div><span>Écart soir</span><strong>${num(c.soirDelta)}</strong><small>clients</small></div>`
 ].join('');
 document.getElementById('table').innerHTML=`<table><thead><tr><th>Année</th><th>Clients</th><th>Midi</th><th>Soir</th><th>Remises</th><th>Montant remisé</th><th>CA concerné</th><th>Tickets</th></tr></thead><tbody>
 ${row('2026',y26)}${row('2025',y25)}
 </tbody></table>`;
 drawBars(m25,s25,m26,s26); drawDonut(y26.ca||0,y26.montantRemise||0);
}
function row(y,d){return `<tr><td>${y}</td><td>${num(d.clients)}</td><td>${num(d.services?.midi?.clients)}</td><td>${num(d.services?.soir?.clients)}</td><td>${num(d.remises)}</td><td>${euro(d.montantRemise)}</td><td>${euro(d.ca)}</td><td>${num(d.ticketsConcernes)}</td></tr>`}
function drawBars(m25,s25,m26,s26){
 const cv=document.getElementById('bar'),ctx=cv.getContext('2d'),w=cv.width=cv.clientWidth*devicePixelRatio,h=cv.height=260*devicePixelRatio;ctx.clearRect(0,0,w,h);ctx.scale(devicePixelRatio,devicePixelRatio);
 const vals=[m25,s25,m26,s26],labels=['Midi 25','Soir 25','Midi 26','Soir 26'],max=Math.max(1,...vals),bw=55,gap=35,x0=45,base=215;
 vals.forEach((v,i)=>{const bh=v/max*165,x=x0+i*(bw+gap);ctx.fillStyle=i<2?'#94a3b8':'#ef3b3b';ctx.fillRect(x,base-bh,bw,bh);ctx.fillStyle='#0f172a';ctx.font='700 13px system-ui';ctx.fillText(num(v),x,base-bh-8);ctx.fillStyle='#64748b';ctx.fillText(labels[i],x-4,240);});
}
function drawDonut(ca,rem){
 const cv=document.getElementById('donut'),ctx=cv.getContext('2d'),w=cv.width=cv.clientWidth*devicePixelRatio,h=cv.height=260*devicePixelRatio;ctx.clearRect(0,0,w,h);ctx.scale(devicePixelRatio,devicePixelRatio);
 const total=Math.max(1,ca+rem),cx=130,cy=125,r=82;let start=-Math.PI/2;
 [[ca,'#111827'],[rem,'#ef3b3b']].forEach(([v,col])=>{const a=v/total*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+a);ctx.closePath();ctx.fillStyle=col;ctx.fill();start+=a;});
 ctx.beginPath();ctx.arc(cx,cy,45,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();ctx.fillStyle='#0f172a';ctx.font='800 14px system-ui';ctx.fillText('CA / remises',88,130);
}
refreshData().catch(e=>setStatus('Erreur chargement: '+e.message));
