
/* ================= v2: routing ================= */
const VIEWS=['directory','map','finder','kit','benchmarks','events','grants','guidelines','board'];
let mapDrawn=false, benchDone=false, boardLoaded=false;
function showView(v){
  for(const x of VIEWS){ const el=document.getElementById('v-'+x); if(el) el.hidden = x!==v; }
  document.querySelectorAll('.tabs a').forEach(a=>{ if(a.dataset.view===v) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(v==='map' && !mapDrawn) drawMap();
  if(v==='benchmarks' && !benchDone) renderBench();
  if(v==='board' && !boardLoaded) loadBoard();
  if(v==='kit') initKit();
  if(v==='events' && !evDone) renderEvents();
  if(v==='grants' && !grantsDone) initGrants();
}
let firstRoute=true;
function route(){
  const h=(location.hash||'').replace('#','');
  if(VIEWS.includes(h)) { showView(h); const tabs=document.querySelector('.tabs'); if(window.innerWidth<720 && tabs && !firstRoute){ const m=document.querySelector('.mast'); const go=()=>window.scrollTo({top:m?m.offsetTop+m.offsetHeight:0,behavior:'instant'}); go(); requestAnimationFrame(go); setTimeout(go,60); setTimeout(go,250); } else window.scrollTo({top:0,behavior:'instant'}); firstRoute=false; return; }
  if(h.startsWith('j-')){ showView('directory'); const t=document.getElementById(h); if(t){ t.scrollIntoView({block:'start'}); t.classList.add('lead'); } return; }
  showView('directory');
}
window.addEventListener('hashchange',()=>{firstRoute=false;route();});
document.getElementById('asof').textContent=fmt(META.asof); document.querySelectorAll('.asof2').forEach(e=>e.textContent=fmt(META.asof));

/* ================= award history (JLARC) ================= */
function awardsHtml(r){
  if((!r.jlarc||!r.jlarc.years||!Object.keys(r.jlarc.years).length)&&r.local_awards) return localOnlyHtml(r);
  const j=r.jlarc; if(!j||!j.years||!Object.keys(j.years).length) return '';
  const yrs=Object.keys(j.years).sort().reverse();
  const la=r.local_awards&&r.local_awards.years?r.local_awards.years:null; const lyrs=la?Object.keys(la).sort().reverse():[];
  const lrows=lyrs.map(y=>{const s=la[y];const amts=s.awards.map(a=>a.amount).filter(a=>typeof a==='number').sort((p,q)=>p-q);const out=s.awards.filter(a=>!a.dmo);return `<tr class="loc"><td>${y}<span class="src">minutes</span></td><td>${s.awards.length||'–'}</td><td>${s.total!=null?money(s.total):'–'}</td><td>${out.length||'–'}</td><td>${amts.length?money(amts[Math.floor(amts.length/2)]):'–'}</td><td>${amts.length?money(amts[amts.length-1]):'–'}</td><td>–</td><td>–</td></tr>`;}).join('');
  const rows=yrs.map(y=>{const s=j.years[y];const cpn=s.nights&&s.ev_total?Math.round(s.ev_total/s.nights):null;return `<tr><td>${y}</td><td>${s.awards}</td><td>${money(s.total)}</td><td>${s.ev_awards}</td><td>${s.ev_median!=null?money(s.ev_median):'–'}</td><td>${s.ev_max!=null?money(s.ev_max):'–'}</td><td>${s.nights!=null?s.nights.toLocaleString():'–'}</td><td>${cpn!=null?'$'+cpn:'–'}</td></tr>`;}).join('');
  const latest=j.years[yrs[0]];
  const lnote=lyrs.length?`<div class="top">${lyrs.join(', ')} rows come from council and committee records (the state dataset ends at 2024); there "awards" counts every recipient including the jurisdiction's own contracts, and "event awards" means outside recipients.</div>`:'';
  const top=(latest.top||[]).slice(0,3).map(t=>`${esc(t.recipient)} (${money(t.amount)}, ${esc((t.type||'').replace('Event/Festival','event').toLowerCase())})`).join('; ');
  const bt=latest.bytype||{}; const split=`${yrs[0]} split: events ${money(bt['Event/Festival']||0)}, marketing ${money(bt['Marketing']||0)}, facilities ${money(bt['Facility']||0)}.`;
  const shared=latest.shared_nights?`<div class="top warn2">${latest.shared_nights.toLocaleString()} of these ${yrs[0]} nights come from recipients also funded by ${[...new Set((latest.shared||[]).flatMap(s=>s[1]))].slice(0,4).join(', ')}; the same visitors may be counted there too.</div>`:'';
  return `<details><summary>Award history (JLARC reports) <span>${yrs.length} yr</span></summary><div class="awards">${shared}<button class="btn ghost2 small" data-detail="${esc(r.name)}">Every recipient, every year</button><div class="tw"><table><thead><tr><th>Year</th><th>Awards (all)</th><th>Total (all)</th><th>Event awards</th><th>Event median</th><th>Event max</th><th>Event nights</th><th>$/night</th></tr></thead><tbody>${lrows}${rows}</tbody></table></div>${lnote}<div class="top">${split}</div>${top?`<div class="top">Largest ${yrs[0]} recipients: ${top}</div>`:''}${latest.forprofit!=null?`<div class="top">${latest.forprofit} of ${latest.awards} ${yrs[0]} awards went to recipients that appear to be businesses.</div>`:''}<div class="top">From the jurisdiction's annual reports to JLARC. Room nights are event recipients' own estimates; marketing and facility rows are excluded from nights because DMOs report county-wide totals.</div></div></details>`;
}
function verifyHtml(r){
  return `<div class="verify"><span>Last verified ${fmt(r.verified||META.asof)}</span><button class="corr" data-j="${esc(r.name)}">Report a correction</button></div>`;
}

/* ================= corrections ================= */
const modal=document.getElementById('modal'), modalBody=document.getElementById('modalBody');
function openModal(html){ modalBody.innerHTML=html; modal.hidden=false; }
function closeModal(){ modal.hidden=true; modalBody.innerHTML=''; modal.querySelector('.modalbox').classList.remove('wide'); }
document.getElementById('modalX').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
document.getElementById('main').addEventListener('click',e=>{
  const b=e.target.closest('.corr'); if(!b) return;
  const j=b.dataset.j;
  openModal(`<h3>Correction for ${esc(j)}</h3><p class="gdesc">Deadline, contact, roster, pool or anything else that is out of date. City staff corrections are applied in the next update.</p><textarea id="corrText" rows="5" placeholder="What is wrong and what it should say"></textarea><input id="corrEmail" type="email" placeholder="Your email (optional, for follow-up)" value="${account?esc(account.email):''}"><div class="rowbtn"><button class="btn" id="corrSend">Send</button><span class="hint2" id="corrMsg"></span></div>`);
  document.getElementById('corrSend').addEventListener('click',async()=>{
    const text=document.getElementById('corrText').value.trim(); const email=document.getElementById('corrEmail').value.trim();
    const msg=document.getElementById('corrMsg'); if(!text){msg.textContent='Add a note first.';return;}
    if(db){ try{ await db.collection('corrections').add({jurisdiction:j,text,email:email||null,created:new Date().toISOString(),page:location.hash}); msg.textContent='Sent. Thank you.'; setTimeout(closeModal,900);} catch(e){ msg.textContent='Could not save here. Email '+META.contact+' instead.'; } }
    else { msg.textContent='Copy this note and email it to '+META.contact+'.'; }
  });
});

/* ================= map ================= */
const CITY_XY = META.cities;
function measureOf(r,mode){
  if(mode==='pool') return r.competitive_pool_usd;
  if(mode==='nights'){ const j=r.jlarc; if(!j) return null; const y=Object.keys(j.years||{}).sort().reverse()[0]; return y? j.years[y].nights : null; }
  return null;
}
function statusColor(r){
  if(!r) return 'var(--off-bg)';
  const s=status(r);
  if(s.key==='none') return 'var(--off-bg)';
  if(s.key==='unknown') return 'var(--warn-bg)';
  if(s.key==='closed') return 'var(--line-strong)';
  if(r.deadline && daysUntil(r.deadline)<=30 && r.cycle!=='rolling') return 'var(--accent)';
  return 'var(--ok)';
}
let mapMode='status';
function drawMap(){
  if(!window.d3||!window.topojson){ document.getElementById('wamap').outerHTML='<p class="empty">Map library did not load.</p>'; return; }
  mapDrawn=true;
  const NS='http://www.w3.org/2000/svg';
  const el=(t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);return n;};
  const topo=JSON.parse(document.getElementById('geo').textContent);
  const counties=topojson.feature(topo,topo.objects.counties);
  const svg=document.getElementById('wamap'); const W=960,H=600;
  const proj=d3.geoAlbers().rotate([120,0]).parallels([46,48.5]).fitExtent([[10,10],[W-10,H-10]],counties);
  const path=d3.geoPath(proj);
  const byCounty={}; data.filter(r=>r.type==='county').forEach(r=>byCounty[r.county]=r);
  const cities=data.filter(r=>r.type==='city' && CITY_XY[r.name]);
  const g=el('g',{}); svg.appendChild(g);
  const tip=document.getElementById('maptip'), wrap=document.querySelector('.mapwrap');
  function showTip(ev,html){ tip.innerHTML=html; tip.hidden=false; const b=wrap.getBoundingClientRect(); let x=ev.clientX-b.left+12, y=ev.clientY-b.top+12; if(x+270>b.width) x=b.width-270; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function hideTip(){ tip.hidden=true; }
  function tipFor(r,label){ if(!r) return `<b>${esc(label)}</b>Not in the directory`; const s=status(r); const m=measureOf(r,'pool'); return `<b>${esc(r.name)}</b>${s.label}${r.deadline?` · ${fmt(r.deadline)}`:''}${m!=null?`<br>${money(m)} open to applicants`:''}${r.jlarc?`<br>${(measureOf(r,'nights')||0).toLocaleString()} paid room nights from events`:''}<br><span style="opacity:.75">Click to open</span>`; }
  const cpaths=counties.features.map(d=>{
    const p=el('path',{class:'cty',d:path(d)}); p.__d=d;
    p.addEventListener('mousemove',ev=>showTip(ev,tipFor(byCounty[d.properties.name],d.properties.name+' County'))); p.addEventListener('mouseleave',hideTip);
    p.addEventListener('click',()=>{const r=byCounty[d.properties.name]; if(r) location.hash='#j-'+slug(r.name);});
    g.appendChild(p); return p;
  });
  counties.features.forEach(d=>{const c=path.centroid(d); const t=el('text',{class:'lbl','text-anchor':'middle',x:c[0],y:c[1]+3}); t.textContent=d.properties.name; g.appendChild(t);});
  const cg=el('g',{}); svg.appendChild(cg);
  const circles=cities.map(r=>{
    const xy=proj([CITY_XY[r.name][1],CITY_XY[r.name][0]]);
    const c=el('circle',{class:'city',cx:xy[0],cy:xy[1],r:5.5}); c.__r=r;
    c.addEventListener('mousemove',ev=>showTip(ev,tipFor(r))); c.addEventListener('mouseleave',hideTip); c.addEventListener('click',()=>{location.hash='#j-'+slug(r.name);});
    cg.appendChild(c); return c;
  });
  function mix(a,b,t){const h=x=>[parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)];const A=h(a),B=h(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
  function paint(){
    const mode=mapMode; const leg=document.getElementById('maplegend');
    if(mode==='status'){
      cpaths.forEach(p=>p.setAttribute('fill',statusColor(byCounty[p.__d.properties.name])));
      circles.forEach(c=>{c.setAttribute('r',5.5);c.setAttribute('fill',statusColor(c.__r));c.removeAttribute('fill-opacity');});
      leg.innerHTML=`<span><i style="background:var(--ok)"></i>Open</span><span><i style="background:var(--accent)"></i>Due within 30 days</span><span><i style="background:var(--line-strong)"></i>Closed for this cycle</span><span><i style="background:var(--warn-bg)"></i>Date not posted</span><span><i style="background:var(--off-bg)"></i>No LTAC pool or not in directory</span>`;
    } else {
      const vals=data.map(r=>measureOf(r,mode)).filter(v=>v!=null&&v>0);
      const max=Math.max(1,...vals); const smax=Math.sqrt(max);
      const col=v=>mix('#dfe8e2','#173d30',Math.min(1,Math.sqrt(v)/smax));
      cpaths.forEach(p=>{const r=byCounty[p.__d.properties.name]; const v=r?measureOf(r,mode):null; p.setAttribute('fill',v==null?'var(--off-bg)':col(v));});
      const rs=v=>3+19*Math.sqrt(v)/smax;
      circles.forEach(c=>{const v=measureOf(c.__r,mode); c.setAttribute('r',v==null?3:rs(v)); c.setAttribute('fill',v==null?'var(--off)':'var(--accent)'); c.setAttribute('fill-opacity','.85');});
      leg.innerHTML=`<span><i style="background:#dfe8e2"></i>County: low</span><span><i style="background:#173d30"></i>County: high</span><span><i style="background:var(--accent);border-radius:50%"></i>City: dot size scales with ${mode==='pool'?'dollars open to applicants':'paid room nights from events reported to JLARC'}</span><span><i style="background:var(--off);border-radius:50%"></i>Not documented</span>`;
    }
  }
  paint();
  document.getElementById('mapMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mapMode=b.dataset.v;document.querySelectorAll('#mapMode button').forEach(x=>x.setAttribute('aria-pressed',x===b));paint();});
}

/* ================= finder ================= */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
(function(){ const sel=document.getElementById('f-counties'); [...new Set(data.map(r=>r.county))].sort().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);}); })();
function programsFor(r){
  const out=[];
  if(r.has_ltac_grants) out.push({kind:'ltac',name:r.name+' lodging tax grants',jur:r,url:r.url,deadline:r.deadline,next:nextExpected(r),pool:r.competitive_pool_usd,fp:r.for_profit,text:[r.notes,r.deadline_pattern,r.pool_note].join(' ')});
  (r.alternatives||[]).forEach(a=>out.push({kind:'alt',name:a.program,jur:r,url:a.url,deadline:a.deadline,next:null,pool:null,fp:(/for-profit|business/i.test(a.eligibility||'')&&!/not eligible|must partner|nonprofit only|501\(c\)\(3\) only/i.test(a.eligibility||''))?'yes':(/fiscal sponsor|partner with/i.test(a.eligibility||'')?'sponsor':(/nonprofit|501/i.test(a.eligibility||'')?'no':'unknown')),text:[a.funds,a.eligibility,a.notes,a.deadline_pattern].join(' '),a}));
  return out;
}
document.getElementById('finderForm').addEventListener('submit',e=>{
  e.preventDefault();
  const kind=document.getElementById('f-kind').value, app=document.getElementById('f-app').value, month=document.getElementById('f-month').value, amt=+document.getElementById('f-amt').value;
  const counties=[...document.getElementById('f-counties').selectedOptions].map(o=>o.value); const fiscal=document.getElementById('f-fiscal').checked; const openOnly=document.getElementById('f-openonly').checked;
  const res=[];
  for(const r of data){
    if(counties.length && !counties.includes(r.county)) continue;
    for(const p of programsFor(r)){
      let score=0, why=[], excl=false;
      if(app==='forprofit'){
        if(p.fp==='yes'){score+=3;why.push('<b>Businesses may apply directly.</b>');}
        else if(p.fp==='sponsor'){ if(fiscal){score+=1;why.push('For-profits apply through a nonprofit or public fiscal sponsor.');} else excl=true; }
        else if(p.fp==='no'){ if(fiscal){score-=1;why.push('Local rule says nonprofit or public applicants; a fiscal sponsor is the usual workaround and the statute does not bar businesses.');} else excl=true; }
        else {score+=1;why.push('Applicant type not stated in the guidelines; ask staff and cite RCW 67.28.1816.');}
      } else if(app==='public'){ if(p.kind==='alt'&&/individual|artist/i.test(p.text)) score-=1; }
      if(kind==='facility'){ if(p.kind==='ltac'){ if(/capital/i.test(p.text)) {score+=1;why.push('Program mentions capital or facility funding.');} else why.push('Facility operations are eligible; capital usually only for public or PFD facilities.'); } else if(!/facilit|capital|infrastructure/i.test(p.text)) excl=true; }
      if(kind==='marketing'){ if(p.kind==='alt'&&/event only|events? and festivals? only/i.test(p.text)) score-=1; }
      if(kind==='event'){ if(/event|festival/i.test(p.text)||p.kind==='ltac') score+=1; else if(/marketing only|operations of facilit/i.test(p.text)) score-=1; }
      if(amt){ const j=p.jur.jlarc; const y=j&&Object.keys(j.years||{}).sort().reverse()[0]; const mx=y?j.years[y].max:null; if(p.kind==='ltac'){ if(mx!=null){ if(mx>=amt){score+=2;why.push(`Largest recent award ${money(mx)} meets your target.`);} else {score-=2;why.push(`Largest recent award was ${money(mx)}, below your target.`);} } else if(p.pool!=null){ if(p.pool>=amt){score+=1;} else {score-=2;why.push(`Only about ${money(p.pool)} is open to applicants in a year.`);} } } }
      const dl=p.deadline&&daysUntil(p.deadline)>=0?p.deadline:(p.next||null);
      if(openOnly){ if(p.jur.cycle==='rolling'&&p.kind==='ltac'){} else if(!dl||daysUntil(dl)>180) excl=true; }
      if(month&&p.kind==='ltac'&&p.jur.funding_year){ why.push(`Funds the ${esc(String(p.jur.funding_year))} program year; an event in ${month} must fall inside it.`); }
      if(p.kind==='ltac'&&p.jur.presentation&&p.jur.presentation.required) why.push('Applicants present to the committee.');
      if(excl) continue;
      res.push({p,score,why,dl});
    }
  }
  res.sort((a,b)=>b.score-a.score||(a.dl||'9').localeCompare(b.dl||'9'));
  const out=document.getElementById('finderOut');
  if(!res.length){ out.innerHTML='<p class="empty">No program fits those filters. Widen the counties or allow a fiscal sponsor.</p>'; return; }
  out.innerHTML=`<p class="gdesc" style="margin-top:14px">${res.length} programs, best fit first. Scores are a rough fit, not a prediction.</p><div class="fres">`+res.slice(0,60).map(({p,score,why,dl})=>{
    const r=p.jur; const when = p.kind==='ltac'&&r.cycle==='rolling'?'Rolling':(dl?`${daysUntil(dl)>=0?'Due':'Last due'} ${fmt(dl)}${p.next&&dl===p.next?' (projected)':''}`:'Deadline not posted');
    return `<div class="fr"><h4>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`:esc(p.name)}</h4><span class="score">fit ${score>=0?'+':''}${score}</span><div class="meta"><span>${esc(r.name)}${r.type==='city'?`, ${esc(r.county)} County`:''}</span><span>${when}</span>${p.pool!=null?`<span>${money(p.pool)} open to applicants</span>`:''}${p.a&&p.a.funds?`<span>${esc(p.a.funds).slice(0,120)}</span>`:''}<a href="#j-${slug(r.name)}">Open card</a></div>${why.length?`<div class="why">${why.join(' ')}</div>`:''}</div>`;}).join('')+'</div>';
});

/* ================= kit ================= */
let kitInit=false;
function initKit(){
  if(kitInit) return; kitInit=true;
  const ids=['c-paid','c-free','c-overlap','c-far','c-oos','c-lodge','c-ppr','c-nights','c-block'];
  const g=id=>parseFloat(document.getElementById(id).value)||0;
  let calcText='';
  function calc(){
    const paid=g('c-paid'),free=g('c-free'),ov=g('c-overlap')/100,far=g('c-far')/100,oos=g('c-oos')/100,lodge=g('c-lodge')/100,ppr=g('c-ppr')||2.4,nn=g('c-nights')||1,block=g('c-block');
    const entries=paid+free, unique=Math.round(paid+free*(1-ov)), farN=Math.round(unique*far), oosN=Math.round(farN*oos), lodgeN=Math.round(farN*lodge), noLodge=unique-lodgeN, rooms=lodgeN/ppr, nights=Math.round(rooms*nn)+block;
    const rows=[['Session entries',entries,'Paid admissions plus free attendance'],['Overall attendance (unique)',unique,`${Math.round(ov*100)}% of free attendees also attend the paid session`],['Attendees traveling 50+ miles',farN,`${Math.round(far*100)}% of unique attendees`],['Out of state or out of country',oosN,`${Math.round(oos*100)}% of the 50+ mile group`],['Paid overnight lodging (people)',lodgeN,`${Math.round(lodge*100)}% of the 50+ mile group`],['No paid lodging (people)',noLodge,'Everyone else'],['Paid lodging nights',nights,`${lodgeN.toLocaleString()} people ÷ ${ppr} per room = ${Math.round(rooms).toLocaleString()} rooms × ${nn} nights, plus ${block} participant room nights`]];
    document.getElementById('calcOut').innerHTML=`<table>${rows.map(r=>`<tr><td>${r[0]}<span class="how">${r[2]}</span></td><td>${r[1].toLocaleString()}</td></tr>`).join('')}</table>`;
    calcText=rows.map(r=>`${r[0]}: ${r[1].toLocaleString()} (${r[2]})`).join('\n')+'\nMethod: Structured Estimate';
  }
  ids.forEach(id=>document.getElementById(id).addEventListener('input',calc)); calc();
  document.getElementById('copyCalc').addEventListener('click',()=>copyText(calcText,'copyCalcMsg'));
  // budget
  const lines=[['Participant stipends, travel and fuel',22500,20000],['Site rental',7500,0],['Fencing, light towers, generators, power',12000,0],['Stage, sound, entertainment',7500,0],['Tents, tables, signage',4000,0],['Restrooms, handwash, waste',6000,0],['Event liability insurance (jurisdiction as additional insured)',6000,0],['Permits, fire marshal plan, traffic control plan, business registration',2500,0],['Security and off-duty law enforcement',8000,0],['Medical and EMS standby',2500,0],['Traffic control and parking management',7500,0],['Ticketing platform and card fees',4500,0],['Paid event staff',12500,0],['Volunteer program',2500,0],['Out-of-area marketing (drive and fly markets, hotel packages)',45000,30000],['Local marketing and PR',5000,0],['Website, photo, video, print',4000,0],['Contingency (about 5%)',10000,0]];
  const tb=document.querySelector('#budget tbody');
  function row(n,a,gp){ const tr=document.createElement('tr'); tr.innerHTML=`<td><input value="${esc(n)}"></td><td><input type="number" value="${a}" min="0"></td><td><input type="number" value="${gp}" min="0"></td>`; return tr; }
  lines.forEach(l=>tb.appendChild(row(...l)));
  function totals(){ let t=0,gr=0; tb.querySelectorAll('tr').forEach(tr=>{const i=tr.querySelectorAll('input'); t+=+i[1].value||0; gr+=+i[2].value||0;}); document.getElementById('b-total').textContent=t.toLocaleString(); document.getElementById('b-grant').textContent=gr.toLocaleString(); }
  tb.addEventListener('input',totals); totals();
  document.getElementById('addLine').addEventListener('click',()=>{tb.appendChild(row('New line',0,0));});
  document.getElementById('copyBudget').addEventListener('click',()=>{ let s='Expense line\tAmount\tGrant pays\n'; tb.querySelectorAll('tr').forEach(tr=>{const i=tr.querySelectorAll('input'); s+=`${i[0].value}\t${(+i[1].value||0).toLocaleString()}\t${(+i[2].value||0).toLocaleString()}\n`;}); s+=`Total\t${document.getElementById('b-total').textContent}\t${document.getElementById('b-grant').textContent}\n\nReduced-award plan\n`; document.querySelectorAll('#reduced tbody tr').forEach(tr=>{const i=tr.querySelectorAll('input,textarea'); s+=`${i[0].value}: ${i[1].value}\n`;}); copyText(s,'copyBudgetMsg'); });
  document.getElementById('copyReport').addEventListener('click',()=>{ let s='Field\tEstimate\tActual\tMethod\n'; document.querySelectorAll('#report tbody tr').forEach(tr=>{const c=tr.children; const v=x=>x.querySelector('input,select')?x.querySelector('input,select').value:x.textContent.trim(); s+=`${c[0].textContent.trim()}\t${v(c[1])}\t${v(c[2])}\t${v(c[3])}\n`;}); copyText(s,'copyReportMsg'); });
}
function copyText(s,msgId){ const m=document.getElementById(msgId); const done=()=>{m.textContent='Copied.';setTimeout(()=>m.textContent='',1500);}; if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(s).then(done).catch(()=>fallback()); } else fallback(); function fallback(){ const ta=document.createElement('textarea'); ta.value=s; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');done();}catch(e){m.textContent='Select and copy manually.';} ta.remove(); } }

/* ================= benchmarks ================= */
let peer='all', benchSort={k:'competitive_pool_usd',dir:-1};
function benchRows(){
  return data.filter(r=>peer==='all'||r.type===peer).map(r=>{
    const j=r.jlarc; const y=j&&Object.keys(j.years||{}).sort().reverse()[0]; const s=y?j.years[y]:null;
    const share=(r.total_pool_usd&&r.competitive_pool_usd!=null)?r.competitive_pool_usd/r.total_pool_usd:null;
    const cpn=s&&s.nights&&s.ev_total?s.ev_total/s.nights:null;
    return {r,name:r.name,total_pool_usd:r.total_pool_usd,competitive_pool_usd:r.competitive_pool_usd,share,awards:s?s.awards:null,median:s?s.ev_median:null,max:s?s.ev_max:null,nights:s?s.nights:null,cpn,year:y,evtotal:s?s.ev_total:null};
  });
}
function renderBench(){
  benchDone=true;
  const rows=benchRows();
  const has=rows.filter(x=>x.year).length;
  document.getElementById('benchNote').textContent = has? `JLARC figures available for ${has} of ${rows.length} jurisdictions shown; the others have not been matched to a report yet. "$ per room night" is lodging tax awarded to events divided by the paid room nights those event recipients reported, a rough efficiency measure. Median and largest award are for event awards; the awards count includes marketing and facility awards.` : 'JLARC report data has not been loaded yet; award and room-night columns fill in once it is.';
  const bars=(title,sub,items,fmtv)=>{ const mx=Math.max(...items.map(i=>i.v)); return `<div class="chart"><h4>${title}</h4><p class="sub2">${sub}</p><div class="bars">${items.map(i=>`<div class="b" data-detail="${esc(i.n)}" role="button" tabindex="0"><span class="n" title="${esc(i.n)}">${esc(i.n)}</span><span class="t"><i style="width:${Math.max(2,i.v/mx*100)}%"></i></span><span class="v">${fmtv(i.v)}</span></div>`).join('')}</div></div>`; };
  const c1=rows.filter(x=>x.competitive_pool_usd).sort((a,b)=>b.competitive_pool_usd-a.competitive_pool_usd).slice(0,15).map(x=>({n:x.name,v:x.competitive_pool_usd}));
  const c2=rows.filter(x=>x.share!=null&&x.total_pool_usd>=100000).sort((a,b)=>b.share-a.share).slice(0,15).map(x=>({n:x.name,v:x.share*100}));
  const c3=rows.filter(x=>x.nights).sort((a,b)=>b.nights-a.nights).slice(0,15).map(x=>({n:x.name,v:x.nights}));
  const c4=rows.filter(x=>x.cpn&&x.nights>=200).sort((a,b)=>a.cpn-b.cpn).slice(0,15).map(x=>({n:x.name,v:x.cpn}));
  let html=bars('Most dollars open to applicants','Latest documented cycle, after standing commitments',c1,money)+bars('Largest share of the fund open to applicants','Funds of $100K or more; higher means less is pre-committed',c2,v=>Math.round(v)+'%');
  if(c3.length) html+=bars('Most paid room nights from funded events','Event recipients\' reports to JLARC, latest year',c3,v=>Math.round(v).toLocaleString());
  if(c4.length) html+=bars('Lowest event dollars per reported room night','Programs whose events report 200+ nights; lower means more nights per dollar',c4,v=>'$'+Math.round(v));
  const c5=rows.filter(x=>x.max).sort((a,b)=>b.max-a.max).slice(0,15).map(x=>({n:x.name,v:x.max}));
  if(c5.length) html+=bars('Largest single event award','Latest JLARC year; the realistic ceiling for an ask',c5,money);
  document.getElementById('benchCharts').innerHTML=html;
  renderBenchTable();
}
function renderBenchTable(){
  const rows=benchRows(); const k=benchSort.k, d=benchSort.dir;
  rows.sort((a,b)=>{const x=a[k],y=b[k]; if(x==null&&y==null) return a.name.localeCompare(b.name); if(x==null) return 1; if(y==null) return -1; return typeof x==='string'?d*x.localeCompare(y):d*(x-y);});
  const n=v=>v==null?'<td class="num">–</td>':`<td class="num">${v}</td>`;
  document.querySelector('#benchTable tbody').innerHTML=rows.map(x=>`<tr><td><a href="#j-${slug(x.r.name)}" data-detail="${esc(x.name)}">${esc(x.name)}</a></td>${n(x.total_pool_usd!=null?money(x.total_pool_usd):null)}${n(x.competitive_pool_usd!=null?money(x.competitive_pool_usd):null)}${n(x.share!=null?Math.round(x.share*100)+'%':null)}${n(x.awards!=null?x.awards+(x.year?' ('+x.year+')':''):null)}${n(x.evtotal!=null?money(x.evtotal):null)}${n(x.median!=null?money(x.median):null)}${n(x.max!=null?money(x.max):null)}${n(x.nights!=null?Math.round(x.nights).toLocaleString():null)}${n(x.cpn!=null?'$'+Math.round(x.cpn):null)}</tr>`).join('');
  document.querySelectorAll('#benchTable th').forEach(th=>{ if(th.dataset.k===k) th.setAttribute('aria-sort',d>0?'ascending':'descending'); else th.removeAttribute('aria-sort'); });
}
document.querySelector('#benchTable thead').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k; if(benchSort.k===k) benchSort.dir*=-1; else benchSort={k,dir:k==='name'?1:-1}; renderBenchTable();});
document.getElementById('benchPeer').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;peer=b.dataset.v;document.querySelectorAll('#benchPeer button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderBench();});

/* ================= board ================= */
let boardFilter='all', boardPosts=[];
function renderBoard(){
  const list=document.getElementById('boardList');
  const posts=boardPosts.filter(p=>boardFilter==='all'||p.type===boardFilter);
  list.innerHTML = posts.length ? posts.map(p=>`<div class="post"><span class="k ${esc(p.type)}">${p.type==='city'?'Seeking events':'Offering an event'}</span><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p><div class="meta"><span>${esc(p.org)}</span>${p.counties?`<span>Counties: ${esc(p.counties)}</span>`:''}${p.months?`<span>Months: ${esc(p.months)}</span>`:''}<span>${p.created?fmt(p.created.slice(0,10)):''}</span></div><div class="ct">${esc(p.name)} · ${esc(p.email)}</div></div>`).join('') : '<p class="empty">No posts yet. Be the first.</p>';
}
async function loadBoard(){
  boardLoaded=true;
  const st=document.getElementById('boardStatus'), form=document.getElementById('boardForm');
  if(!db){ st.textContent='Posts could not be loaded. Email '+META.contact+' to be listed.'; renderBoard(); return; }
  try{ const snap=await db.collection('board').orderBy('created','desc').limit(100).get(); boardPosts=snap.docs.map(d=>d.data()); } catch(e){ boardPosts=[]; }
  renderBoard();
  if(canFollow){ form.hidden=false; if(account) document.getElementById('bf-email').value=account.email; }
  else st.textContent='Posting requires a link that allows contributing; viewing is open to everyone.';
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const g=id=>document.getElementById(id).value.trim();
    const post={type:g('bf-type'),org:g('bf-org'),name:g('bf-name'),email:g('bf-email').toLowerCase(),title:g('bf-title'),body:g('bf-body'),counties:g('bf-counties'),months:g('bf-months'),created:new Date().toISOString()};
    try{ let uid=null; try{uid=userCap?await userCap.id():null;}catch(x){} post.userId=uid; await db.collection('board').add(post); boardPosts.unshift(post); renderBoard(); form.reset(); st.textContent='Posted.'; }
    catch(err){ st.textContent='Could not post from this link.'; }
  });
}
document.getElementById('boardFilter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;boardFilter=b.dataset.v;document.querySelectorAll('#boardFilter button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderBoard();});

/* initial route runs at the end of the file */

/* ================= guideline audience switch ================= */
(function(){ const seg=document.getElementById('guideSeg'); if(!seg) return;
  seg.addEventListener('click',e=>{const btn=e.target.closest('button'); if(!btn) return; const v=btn.dataset.v;
    seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===btn));
    document.querySelectorAll('#v-guidelines .guide').forEach(s=>{ s.hidden = v!=='all' && s.dataset.g!==v; });
    const first=document.querySelector('#v-guidelines .guide:not([hidden])'); if(v!=='all'&&first) first.scrollIntoView({block:'start'});
  });
})();

/* ================= jurisdiction detail (award data) ================= */
const TYPEN={E:'Event',M:'Marketing',F:'Facility'};
function detailHtml(r,year){
  const j=r.jlarc; const yrs=Object.keys(j.years).sort().reverse(); year=year&&j.years[year]?year:yrs[0]; const s=j.years[year];
  const sum=yrs.map(y=>{const t=j.years[y];return `<tr><td>${y}</td><td>${t.awards}</td><td>${money(t.total)}</td><td>${money(t.bytype['Event/Festival']||0)}</td><td>${money(t.bytype['Marketing']||0)}</td><td>${money(t.bytype['Facility']||0)}</td><td>${t.nights!=null?t.nights.toLocaleString():'–'}</td><td>${t.shared_nights?t.shared_nights.toLocaleString():'–'}</td></tr>`;}).join('');
  const recs=(s.recs||[]).map(q=>{const [name,ty,amt,n,att,a50,oos,meth,others]=q; const isE=ty==='E';
    return `<tr class="${isE?'':'dim'}"><td>${esc(name)}</td><td>${TYPEN[ty]||'?'}</td><td class="num">${money(amt)}</td><td class="num">${n!=null?n.toLocaleString():'–'}</td><td class="num">${att!=null?att.toLocaleString():'–'}</td><td class="num">${a50!=null?a50.toLocaleString():'–'}</td><td class="num">${oos!=null?oos.toLocaleString():'–'}</td><td class="meth">${esc(meth)}</td><td>${others.length?others.map(o=>{const rr=data.find(x=>x.name===o);return rr?`<a href="#" data-detail="${esc(o)}">${esc(o)}</a>`:esc(o);}).join(', '):''}</td></tr>`;}).join('');
  const sharedList=(s.shared||[]).length?`<p class="hint2">Recipients also funded by a neighboring jurisdiction in ${year}: ${s.shared.map(x=>`<b>${esc(x[0])}</b> (${x[2].toLocaleString()} nights, also ${x[1].join(', ')})`).join('; ')}. The state does not de-duplicate these, so a region's total overstates its real room nights.</p>`:'';
  const dupNote=s.dup_nights?`<p class="hint2">${s.dup_nights.toLocaleString()} nights were reported identically on more than one award to the same recipient and are counted once here.</p>`:'';
  return `<div class="detail">
    <p class="eyebrow2">${r.type==='county'?'County':'City'} · ${esc(r.county)} County${r.competitive_pool_usd!=null?` · ${money(r.competitive_pool_usd)} open to applicants`:''}</p>
    <h3>${esc(r.name)}</h3>
    <p class="hint2">Everything ${esc(r.name)} reported to JLARC, by year and by recipient. Grey rows are marketing and facility contracts; their room nights are usually area-wide estimates and are not added into the event totals. <a href="#j-${slug(r.name)}" onclick="closeModal()">Open the directory card</a>.</p>
    <div class="tw"><table class="dt"><thead><tr><th>Year</th><th>Awards</th><th>Total</th><th>Events</th><th>Marketing</th><th>Facilities</th><th>Event nights</th><th>Of which shared</th></tr></thead><tbody>${sum}</tbody></table></div>
    ${sharedList}${dupNote}
    <div class="yrsel seg">${yrs.map(y=>`<button data-year="${y}" aria-pressed="${y===year}">${y}</button>`).join('')}</div>
    <div class="tw"><table class="dt recs"><thead><tr><th>Recipient</th><th>Type</th><th>Award</th><th>Paid nights</th><th>Attendance</th><th>50+ mi</th><th>Out of state</th><th>Method</th><th>Also funded by</th></tr></thead><tbody>${recs}</tbody></table></div>
    <p class="hint2">Source: JLARC lodging tax reporting, ${year}, self-reported by recipients to the jurisdiction.</p>
    ${localSection(r)}
  </div>`;
}
let detailName=null;
function openDetail(name,year){ const r=data.find(x=>x.name===name); if(!r||(!r.jlarc&&!r.local_awards)) return; if(!r.jlarc){ openModal(localDetailHtml(r)); modal.querySelector('.modalbox').classList.add('wide'); return; } detailName=name; openModal(detailHtml(r,year)); modal.querySelector('.modalbox').classList.add('wide'); modal.querySelector('.modalbox').scrollTop=0; }
document.addEventListener('click',e=>{
  const d=e.target.closest('[data-detail]'); if(d){ e.preventDefault(); openDetail(d.dataset.detail); return; }
  const y=e.target.closest('.yrsel button'); if(y&&detailName){ openDetail(detailName,y.dataset.year); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('[data-detail]')) openDetail(e.target.dataset.detail); });

/* ================= top events ================= */
const EVENTS=JSON.parse(document.getElementById('events').textContent);
let evDone=false;
function renderEvents(){
  evDone=true;
  const sel=document.getElementById('evcounty'); [...new Set(EVENTS.map(e=>e.county).filter(Boolean))].sort().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  const draw=()=>{
    const q=document.getElementById('evq').value.trim().toLowerCase(), sort=document.getElementById('evsort').value, cty=sel.value;
    let rows=EVENTS.filter(e=>(!cty||(e.county||'').includes(cty))&&(!q||[e.name,e.org,e.county,...e.funders].join(' ').toLowerCase().includes(q)));
    const eff=e=>e.nights&&e.ltac?e.ltac/e.nights:null;
    const keyf={nights:e=>-(e.nights||0),att:e=>-(e.att||0),a50:e=>-((e.years[e.latest]||{}).a50||0),ltac:e=>-(e.ltac||0),ltac3:e=>-(e.ltac_3yr||0),eff:e=>eff(e)==null?1e12:eff(e),effhi:e=>eff(e)==null?1e12:-eff(e),year:e=>-(+e.latest||0)*1e9-(e.nights||0)}[sort];
    if(sort==='eff'||sort==='effhi') rows=rows.filter(e=>(e.nights||0)>=200&&e.ltac>0);
    rows=rows.sort((a,b)=>keyf(a)-keyf(b)).slice(0,300);
    document.querySelector('#evTable tbody').innerHTML=rows.map((e,i)=>{const s=e.years[e.latest]; const f=eff(e);
      return `<tr class="evrow" data-ev="${e.key[0]}|${e.key[1]}"><td class="num">${i+1}</td><td><b>${esc(e.name)}</b></td><td>${esc(e.org)}${e.org_is_gov?' <span class="tag">public</span>':''}</td><td>${e.funders.map(f=>{const r=data.find(x=>x.name===f);return r?`<a href="#j-${slug(f)}" onclick="event.stopPropagation()">${esc(f)}</a>`:esc(f);}).join(', ')}</td><td>${e.latest}</td><td class="num">${(e.nights||0).toLocaleString()}</td><td class="num">${(e.att||0).toLocaleString()}</td><td class="num">${(s.a50||0).toLocaleString()}</td><td class="num">${money(e.ltac)}</td><td class="num">${f!=null?'$'+Math.round(f):'–'}</td><td>${e.other&&e.other.length?`${e.other_total?money(e.other_total)+' · ':''}${[...new Set(e.other.map(o=>o.funder))].slice(0,3).map(esc).join(', ')}`:'<span class="dimtxt">none found</span>'}</td></tr>`;}).join('')||'<tr><td colspan="11" class="empty">No events match.</td></tr>';
  };
  ['evq','evsort','evcounty'].forEach(id=>document.getElementById(id).addEventListener('input',draw));
  document.querySelector('#evTable tbody').addEventListener('click',e=>{const tr=e.target.closest('tr.evrow'); if(!tr) return; const [a,b]=tr.dataset.ev.split('|'); const ev=EVENTS.find(x=>x.key[0]===a&&x.key[1]===b); if(ev) openEvent(ev);});
  draw();
}
function openEvent(e){
  const yrs=Object.keys(e.years).sort().reverse();
  const pct=(a,p)=>p?Math.round(a/p*100)+'%':'–';
  const rows=yrs.map(y=>{const s=e.years[y];return `<tr><td>${y}</td><td class="nw">${s.start&&s.start!=="9"?fmt(s.start):"–"}${s.end&&s.end!==s.start?' to '+fmt(s.end):''}</td><td class="num">${(s.nights||0).toLocaleString()}</td><td class="num">${(s.nights_pred||0).toLocaleString()}</td><td class="num">${pct(s.nights,s.nights_pred)}</td><td class="num">${(s.att||0).toLocaleString()}</td><td class="num">${(s.att_pred||0).toLocaleString()}</td><td class="num">${(s.a50||0).toLocaleString()}</td><td class="num">${(s.oos||0).toLocaleString()}</td><td class="num">${money(s.ltac)}</td><td class="num">${money(s.requested)}</td><td class="num">${s.cost?money(s.cost):'–'}</td><td class="meth">${esc(s.method)}</td></tr>`;}).join('');
  const funders=yrs.map(y=>`<li><b>${y}</b>: ${e.years[y].funders.map(f=>{const r=data.find(x=>x.name===f[0]);return (r?`<a href="#j-${slug(f[0])}" onclick="closeModal()">${esc(f[0])}</a>`:esc(f[0]))+' '+money(f[1]);}).join('; ')}</li>`).join('');
  const latest=e.years[e.latest]; const share=latest.cost&&latest.ltac?Math.round(latest.ltac/latest.cost*100):null;
  openModal(`<div class="detail">
    <p class="eyebrow2">Event · ${esc(e.county||'')}${e.county?' County':''} · put on by ${esc(e.org)}</p>
    <h3>${esc(e.name)}</h3>
    <p class="hint2">${(e.nights||0).toLocaleString()} paid room nights reported for ${e.latest}, ${money(e.ltac)} in lodging tax that year${share!=null?` (${share}% of the reported event cost)`:''}${e.ltac_3yr>e.ltac?`, ${money(e.ltac_3yr)} over the years shown`:''}.</p>
    <h4>Post-event reports, estimate versus actual</h4>
    <div class="tw"><table class="dt"><thead><tr><th>Year</th><th>Dates</th><th>Nights actual</th><th>Nights estimated</th><th>Hit</th><th>Attendance</th><th>Est.</th><th>50+ mi</th><th>Out of state</th><th>Lodging tax</th><th>Requested</th><th>Event cost</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h4>Lodging tax funders</h4><ul class="flist">${funders}</ul>
    ${e.local_ltac&&e.local_ltac.length?`<h4>2025 and 2026 lodging tax, from council records</h4><ul class="flist">${e.local_ltac.slice().sort((p,q)=>q.year.localeCompare(p.year)).map(o=>`<li><b>${esc(o.year)}</b>: ${(()=>{const rr=data.find(x=>x.name===o.jurisdiction);return rr?`<a href="#j-${slug(o.jurisdiction)}" onclick="closeModal()">${esc(o.jurisdiction)}</a>`:esc(o.jurisdiction);})()} ${o.amount!=null?money(o.amount):'amount not published'}${o.event?` · ${esc(o.event)}`:''}${o.recipient&&o.recipient!==e.org?` <span class="dimtxt">(to ${esc(o.recipient)})</span>`:''}</li>`).join('')}</ul>`:''}
    <h4>Other funding found</h4>${e.other&&e.other.length?`<div class="tw"><table class="dt"><thead><tr><th>Year</th><th>Funder</th><th>Program</th><th>Amount</th><th>Kind</th><th>Notes</th></tr></thead><tbody>${e.other.slice().sort((p,q)=>(q.year||'').localeCompare(p.year||'')).map(o=>`<tr><td>${esc(o.year||'')}</td><td>${esc(o.funder||'')}</td><td>${esc(o.program||'')}${o.recipient&&o.recipient!==e.org?` <span class="dimtxt">(to ${esc(o.recipient)})</span>`:''}</td><td class="num">${o.amount!=null?money(o.amount):'–'}</td><td>${esc(o.kind||'')}</td><td class="meth">${esc(o.notes||'')}${o.source_url?` <a href="${esc(o.source_url)}" target="_blank" rel="noopener">source</a>`:''}</td></tr>`).join('')}</tbody></table></div>`:`<p class="hint2">No grants, sponsorships or public contracts other than lodging tax turned up in the statewide award lists searched (ArtsWA, NEA, Humanities Washington, 4Culture, county TPAs, port and city programs). Absence here is not proof the event has none.</p>`}
    <p class="hint2">"Hit" is actual room nights as a share of the estimate in the application; committees use this to judge a returning applicant. Figures are the producer's own reports to the funding jurisdiction, as filed with JLARC.</p>
  </div>`);
  modal.querySelector('.modalbox').classList.add('wide');
}

/* ================= alternative program award history ================= */
function altAwardsHtml(a){
  const h=a.awards_history; if(!h||!h.awards||!h.awards.length) return '';
  const yrs=[...new Set(h.awards.map(x=>x.year).filter(Boolean))].sort().reverse();
  const latest=yrs[0]; const L=h.awards.filter(x=>x.year===latest);
  const amts=L.map(x=>x.amount).filter(x=>typeof x==='number');
  const tot=h.total_awarded_latest!=null?h.total_awarded_latest:(amts.length?amts.reduce((s,x)=>s+x,0):null);
  const sample=L.slice(0,3).map(x=>`${esc(x.recipient)}${x.amount!=null?' '+money(x.amount):''}`).join('; ');
  return `<span class="pm aw">${latest}: ${h.awards_count_latest||L.length} award${(h.awards_count_latest||L.length)===1?'':'s'}${tot?`, ${money(tot)} total`:''}${amts.length?`, median ${money(amts.sort((p,q)=>p-q)[Math.floor(amts.length/2)])}`:''}. ${sample}${L.length>3?'…':''} <button class="linkbtn" data-alt="${esc(a.program)}">All recipients</button></span>`;
}
function openAlt(program){
  let a=null,r=null; for(const rr of data){ const f=(rr.alternatives||[]).find(x=>x.program===program&&x.awards_history); if(f){a=f;r=rr;break;} }
  if(!a) return; const h=a.awards_history;
  const yrs=[...new Set(h.awards.map(x=>x.year).filter(Boolean))].sort().reverse();
  const rows=h.awards.slice().sort((p,q)=>(q.year||'').localeCompare(p.year||'')||(q.amount||0)-(p.amount||0)).map(x=>`<tr><td>${esc(x.year||'')}</td><td>${esc(x.recipient||'')}</td><td>${esc(x.event||'')}</td><td class="num">${x.amount!=null?money(x.amount):'–'}</td><td class="meth">${esc(x.notes||'')}</td></tr>`).join('');
  openModal(`<div class="detail">
    <p class="eyebrow2">${esc(r.name)} · other funding route${a.administrator?' · '+esc(a.administrator):''}</p>
    <h3>${esc(a.program)}</h3>
    <p class="hint2">${a.funds?esc(a.funds)+' ':''}${h.typical_award?'Typical award: '+esc(h.typical_award)+'. ':''}Cycles found: ${yrs.join(', ')}.${a.url?` <a href="${esc(a.url)}" target="_blank" rel="noopener">Program page</a>.`:''}</p>
    <div class="tw"><table class="dt"><thead><tr><th>Year</th><th>Recipient</th><th>Event or project</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${h.notes?`<p class="hint2">${esc(h.notes)}</p>`:''}
    <p class="hint2">Sources: ${(h.source_urls||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,'').slice(0,60))}</a>`).join(' · ')}</p>
  </div>`);
  modal.querySelector('.modalbox').classList.add('wide');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-alt]'); if(b){e.preventDefault(); openAlt(b.dataset.alt);}});


function localOnlyHtml(r){
  const la=r.local_awards.years; const yrs=Object.keys(la).sort().reverse();
  const rows=yrs.map(y=>{const s=la[y];const amts=s.awards.map(a=>a.amount).filter(a=>typeof a==='number').sort((p,q)=>p-q);return `<tr class="loc"><td>${y}<span class="src">minutes</span></td><td>${s.awards.length||'–'}</td><td>${s.total!=null?money(s.total):'–'}</td><td>${amts.length?money(amts[Math.floor(amts.length/2)]):'–'}</td><td>${amts.length?money(amts[amts.length-1]):'–'}</td></tr>`;}).join('');
  return `<details><summary>Award history (local records) <span>${yrs.length} yr</span></summary><div class="awards"><button class="btn ghost2 small" data-detail="${esc(r.name)}">Every recipient, every year</button><div class="tw"><table><thead><tr><th>Year</th><th>Awards</th><th>Total</th><th>Median</th><th>Largest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="top">From council and committee records; the state dataset has no rows for this jurisdiction.</div></div></details>`;
}
function localSection(r){
  const la=r.local_awards; if(!la||!la.years) return '';
  const yrs=Object.keys(la.years).sort().reverse();
  const blocks=yrs.map(y=>{const s=la.years[y];const rows=s.awards.slice().sort((p,q)=>(q.amount||0)-(p.amount||0)).map(a=>`<tr class="${a.dmo?'dim':''}"><td>${esc(a.recipient||'')}${a.dmo?' <span class="tag">jurisdiction / DMO</span>':''}</td><td>${esc(a.event||'')}</td><td class="num">${a.amount!=null?money(a.amount):'–'}</td><td class="meth">${esc(a.notes||'')}</td></tr>`).join('');
    return `<h4>${y} awards from council and committee records${s.total!=null?` · ${money(s.total)} total`:''}${s.decided?` · decided ${esc(String(s.decided))}`:''}</h4>${s.note?`<p class="hint2">${esc(s.note)}</p>`:''}${rows?`<div class="tw"><table class="dt"><thead><tr><th>Recipient</th><th>Event or project</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="hint2">Per-award list not published; only the total was found.</p>'}`;}).join('');
  return `${blocks}${la.upcoming?`<p class="hint2"><b>Coming cycle:</b> ${esc(la.upcoming)}</p>`:''}${la.not_found?`<p class="hint2">Not found: ${esc(la.not_found)}</p>`:''}<p class="hint2">Sources: ${(la.sources||[]).slice(0,8).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,'').slice(0,50))}</a>`).join(' · ')}</p>`;
}
function localDetailHtml(r){
  return `<div class="detail"><p class="eyebrow2">${r.type==='county'?'County':'City'} · ${esc(r.county)} County</p><h3>${esc(r.name)}</h3><p class="hint2">The state dataset has no rows for ${esc(r.name)}; these awards come from local records. <a href="#j-${slug(r.name)}" onclick="closeModal()">Open the directory card</a>.</p>${localSection(r)}</div>`;
}

/* ================= other funding (grant catalog) ================= */
const GRANTS=JSON.parse(document.getElementById('grants').textContent);
let grantsDone=false;
function gNext(g){ const ds=(g.deadlines||[]).map(d=>d.date).filter(d=>d&&daysUntil(d)>=0).sort(); return g.next_deadline&&daysUntil(g.next_deadline)>=0?g.next_deadline:(ds[0]||null); }
function gWhere(g){ if(g.level==='statewide') return 'Statewide'; const geo=g.geography||{}; if(g.level==='city') return (geo.cities||[]).join(', ')||'City'; if(g.level==='county') return (geo.counties||[]).map(c=>c+' County').join(', ')||'County'; return geo.region||(geo.counties||[]).map(c=>c+' County').join(', ')||'Regional'; }
function gApplies(g,city,county,region){
  if(g.level==='statewide') return true; const geo=g.geography||{};
  if(g.level==='city') return !!city && (geo.cities||[]).some(c=>c.toLowerCase()===city.toLowerCase());
  if(county && (geo.counties||[]).some(c=>c.toLowerCase()===county.toLowerCase())) return true;
  if(g.level==='county') return false;
  if(g.level==='regional' && region && (geo.region||'').toLowerCase().includes(region.toLowerCase())) return true;
  if(g.level==='regional' && county && (geo.region||'').toLowerCase().includes(county.toLowerCase())) return true;
  return false;
}
function gCard(g){
  const nd=gNext(g); const du=nd?daysUntil(nd):null;
  const badge=g.rolling?'<span class="gb roll">Rolling</span>':(nd?`<span class="gb ${du<=30?'hot':''}">Due ${fmt(nd)}${du<=60?' · '+du+' days':''}</span>`:'<span class="gb off">Next date not posted</span>');
  const fp=(g.applicants||[]).includes('for-profit')?'<span class="gb ok">For-profit OK</span>':((g.applicants||[]).includes('fiscal sponsor accepted')?'<span class="gb">Via fiscal sponsor</span>':'');
  const dl=(g.deadlines||[]).filter(d=>d.date).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>`${fmt(d.date)}${d.label?' ('+esc(d.label)+')':''}`).join('; ');
  const rec=(g.recent_recipients||[]).slice(0,4).map(r=>typeof r==='string'?esc(r):`${esc(r.recipient||r.name||'')}${r.amount!=null?' '+money(r.amount):''}`).join('; ');
  return `<div class="fr gr"><h4>${g.url?`<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)}</a>`:esc(g.name)}</h4><span class="score">${esc(gWhere(g))}</span>
    <div class="why">${badge} ${fp} ${g.award?`<b>${esc(g.award)}</b>`:''}${g.match?` · match: ${esc(g.match)}`:''}${g.reimbursement?' · reimbursement':''}</div>
    <div class="why">${esc(g.funder||'')}${g.kinds&&g.kinds.length?' · '+g.kinds.map(esc).join(', '):''}${g.applicants&&g.applicants.length?' · '+g.applicants.map(esc).join(', '):''}</div>
    ${g.notes?`<div class="why">${esc(g.notes)}</div>`:''}
    <div class="meta">${g.opens?`<span>Opens: ${esc(String(g.opens))}</span>`:''}${dl?`<span>Deadlines: ${dl}</span>`:''}${g.contact?`<span>Contact: ${esc(g.contact)}</span>`:''}${rec?`<span>Recent: ${rec}</span>`:''}${g.confidence?`<span class="dimtxt">${esc(g.confidence)} confidence</span>`:''}</div></div>`;
}
function initGrants(){
  grantsDone=true;
  const sel=document.getElementById('g-city');
  data.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{const o=document.createElement('option');o.value=r.name;o.textContent=r.name+(r.type==='county'?'':' ('+r.county+' County)');sel.appendChild(o);});
  const form=document.getElementById('grantForm');
  form.addEventListener('submit',e=>{e.preventDefault();drawGrants();});
  ['g-city','g-kind','g-app','g-when'].forEach(id=>document.getElementById(id).addEventListener('change',drawGrants));
  // calendar
  const rows=GRANTS.map(g=>({g,nd:gNext(g)})).filter(x=>x.nd||x.g.rolling).sort((a,b)=>{if(a.g.rolling&&!b.g.rolling)return 1;if(!a.g.rolling&&b.g.rolling)return -1;if(!a.nd)return 1;if(!b.nd)return -1;return a.nd.localeCompare(b.nd);});
  document.querySelector('#gcal tbody').innerHTML=rows.map(({g,nd})=>`<tr><td class="num">${g.rolling?'Rolling':fmt(nd)}</td><td><a href="${esc(g.url||'#')}" target="_blank" rel="noopener">${esc(g.name)}</a></td><td>${esc(g.funder||'')}</td><td>${esc(gWhere(g))}</td><td>${esc(g.award||'')}</td><td>${(g.kinds||[]).slice(0,3).map(esc).join(', ')}</td></tr>`).join('');
  drawGrants();
}
function drawGrants(){
  const city=document.getElementById('g-city').value, kind=document.getElementById('g-kind').value, app=document.getElementById('g-app').value, when=document.getElementById('g-when').value;
  const r=city?data.find(x=>x.name===city):null; const county=r?r.county:null; const region=r?r.region:null; const cityName=r&&r.type==='city'?r.name:null;
  let list=GRANTS.filter(g=>!city||gApplies(g,cityName,county,region));
  if(kind) list=list.filter(g=>(g.kinds||[]).includes(kind)||(kind==='cultural'&&(g.kinds||[]).some(k=>k==='heritage')));
  if(app) list=list.filter(g=>{const a=g.applicants||[]; if(app==='for-profit') return a.includes('for-profit')||a.includes('fiscal sponsor accepted'); if(app==='public agency') return a.includes('public agency')||a.includes('tribe'); return a.includes(app);});
  if(when==='rolling') list=list.filter(g=>g.rolling);
  if(when==='open') list=list.filter(g=>g.rolling||(gNext(g)&&daysUntil(gNext(g))>=0));
  if(when==='90') list=list.filter(g=>gNext(g)&&daysUntil(gNext(g))<=90);
  const key=g=>g.rolling?1e6:(gNext(g)?daysUntil(gNext(g)):1e7);
  list.sort((a,b)=>key(a)-key(b));
  // lodging tax programs for the location, from the directory
  let ltac='';
  if(r){
    const here=[r].concat(r.type==='city'?data.filter(x=>x.type==='county'&&x.county===r.county):[]).filter(x=>x.has_ltac_grants);
    if(here.length) ltac=`<div class="gband fres"><h3>Lodging tax programs here</h3>${here.map(x=>{const s=status(x);return `<div class="fr gr"><h4><a href="#j-${slug(x.name)}">${esc(x.name)} lodging tax grants</a></h4><span class="score">${x.type==='county'?'County':'City'}</span><div class="why"><span class="gb ${s.key==='open'?'ok':''}">${s.label}${x.deadline?' · '+fmt(x.deadline):''}</span> ${x.competitive_pool_usd!=null?`<b>${money(x.competitive_pool_usd)} open to applicants</b>`:''} ${x.for_profit==='yes'?'<span class="gb ok">For-profit OK</span>':(x.for_profit==='sponsor'?'<span class="gb">Via fiscal sponsor</span>':'')}</div>${x.deadline_pattern?`<div class="why">${esc(x.deadline_pattern)}</div>`:''}</div>`;}).join('')}</div>`;
  }
  const bands=[['city','City programs'],['county','County programs'],['regional','Regional programs'],['statewide','Statewide and national programs']];
  const html=bands.map(([lv,t])=>{const L=list.filter(g=>g.level===lv); return L.length?`<div class="gband fres"><h3>${t} <span class="dimtxt">${L.length}</span></h3>${L.map(gCard).join('')}</div>`:'';}).join('');
  document.getElementById('grantRes').innerHTML=(ltac+html)||'<p class="empty">Nothing in the catalog matches. Loosen a filter.</p>';
}
