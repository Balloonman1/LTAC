
/* ================= v2: routing ================= */
const VIEWS=['directory','map','finder','kit','benchmarks','events','grants','report','guidelines','board'];
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
  if(h.startsWith('compare=')){ showView('benchmarks'); return; }
  if(h.startsWith('report=')){ showView('report'); showReport(decodeURIComponent(h.slice(7))); window.scrollTo({top:document.querySelector('.mast').offsetHeight,behavior:'instant'}); return; }
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
  return `<details><summary>Award history (JLARC reports) <span>${yrs.length} yr</span></summary><div class="awards">${shared}<button class="btn ghost2 small" data-detail="${esc(r.name)}">Every recipient, every year</button> <button class="btn ghost2 small" data-cmp="${esc(r.name)}">Compare with peers</button> <a class="btn ghost2 small" href="#report=${encodeURIComponent(r.name)}">Peer report</a><div class="tw"><table><thead><tr><th>Year</th><th>Awards (all)</th><th>Total (all)</th><th>Event awards</th><th>Event median</th><th>Event max</th><th>Event nights</th><th>$/night</th></tr></thead><tbody>${lrows}${rows}</tbody></table></div>${lnote}<div class="top">${split}</div>${top?`<div class="top">Largest ${yrs[0]} recipients: ${top}</div>`:''}${latest.forprofit!=null?`<div class="top">${latest.forprofit} of ${latest.awards} ${yrs[0]} awards went to recipients that appear to be businesses.</div>`:''}<div class="top">From the jurisdiction's annual reports to JLARC. Room nights are event recipients' own estimates; marketing and facility rows are excluded from nights because DMOs report county-wide totals.</div></div></details>`;
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
  const topo=JSON.parse(document.getElementById(STATE==='WA'?'geo':'geo-'+STATE.toLowerCase()).textContent);
  const counties=topojson.feature(topo,topo.objects.counties);
  const svg=document.getElementById('wamap'); const W=960,H=600;
  const PROJ={WA:[[120,0],[46,48.5]],OR:[[120.5,0],[43,45.5]],ID:[[114.5,0],[43,47.5]]}[STATE]; const proj=d3.geoAlbers().rotate(PROJ[0]).parallels(PROJ[1]).fitExtent([[10,10],[W-10,H-10]],counties);
  const path=d3.geoPath(proj);
  const byCounty={}; data.filter(r=>r.type==='county').forEach(r=>byCounty[r.county]=r);
  const CXY=STATE==='WA'?CITY_XY:(META['cities_'+STATE.toLowerCase()]||{}); const cities=data.filter(r=>r.type!=='county' && CXY[r.name]);
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
    const xy=proj([CXY[r.name][1],CXY[r.name][0]]);
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
const BF={};
function bfRead(){ const g=id=>document.getElementById(id); const n=id=>{const v=g(id)&&g(id).value; return v===''||v==null?null:+v;};
  BF.region=g('bf-region')?g('bf-region').value:''; BF.county=g('bf-county')?g('bf-county').value:''; BF.fp=g('bf-fp')?g('bf-fp').value:''; BF.cycle=g('bf-cycle')?g('bf-cycle').value:'';
  BF.share=n('bf-share'); BF.open=n('bf-open'); BF.ev=n('bf-ev'); BF.med=n('bf-med'); BF.max=n('bf-max'); BF.nights=n('bf-nights'); BF.cpn=n('bf-cpn'); BF.pop=n('bf-pop'); BF.percap=n('bf-percap');
  BF.data=g('bf-data')?g('bf-data').checked:false; BF.prog=g('bf-prog')?g('bf-prog').checked:false; }
function bfPass(x){ const r=x.r;
  if(BF.region&&r.region!==BF.region) return false; if(BF.county&&r.county!==BF.county) return false;
  if(BF.fp&&!BF.fp.split(',').includes(r.for_profit)) return false;
  if(BF.cycle){ if(BF.cycle==='semiannual'){ if(r.cycle!=='semiannual') return false; } else if(r.cycle!==BF.cycle) return false; }
  if(BF.prog&&!r.has_ltac_grants) return false; if(BF.data&&!x.year) return false;
  if(BF.share!=null&&!(x.share!=null&&x.share*100>=BF.share)) return false;
  if(BF.open!=null&&!(x.competitive_pool_usd!=null&&x.competitive_pool_usd>=BF.open)) return false;
  if(BF.ev!=null&&!(x.evtotal!=null&&x.evtotal>=BF.ev)) return false;
  if(BF.med!=null&&!(x.median!=null&&x.median>=BF.med)) return false;
  if(BF.max!=null&&!(x.max!=null&&x.max>=BF.max)) return false;
  if(BF.nights!=null&&!(x.nights!=null&&x.nights>=BF.nights)) return false;
  if(BF.cpn!=null&&!(x.cpn!=null&&x.cpn<=BF.cpn)) return false;
  if(BF.pop!=null&&!(r.population!=null&&r.population<=BF.pop)) return false;
  if(BF.percap!=null&&!(x.percap!=null&&x.percap>=BF.percap)) return false;
  return true; }
function benchRows(){
  bfRead();
  return data.filter(r=>peer==='all'||r.type===peer).map(r=>{
    const j=r.jlarc; let y=j&&Object.keys(j.years||{}).sort().reverse()[0]; let s=y?j.years[y]:null; let local=false;
    if(!s&&r.local_awards&&r.local_awards.years){ const la=r.local_awards.years; const ly=Object.keys(la).sort().reverse()[0]; const l=ly?la[ly]:null;
      if(l){ const ev=l.awards.filter(a=>!a.dmo&&typeof a.amount==='number').map(a=>a.amount).sort((p,q)=>p-q); y=ly; local=true;
        s={total:l.total,awards:l.awards.length,ev_total:ev.length?ev.reduce((a,b)=>a+b,0):null,ev_median:ev.length?ev[Math.floor(ev.length/2)]:null,ev_max:ev.length?ev[ev.length-1]:null,nights:null}; } }
    const share=(r.total_pool_usd&&r.competitive_pool_usd!=null)?r.competitive_pool_usd/r.total_pool_usd:null;
    const cpn=s&&s.nights&&s.ev_total?s.ev_total/s.nights:null;
    const fundAny=r.total_pool_usd!=null?r.total_pool_usd:(s?s.total:null); const percap=r.population&&fundAny?fundAny/r.population:null;
    return {r,name:r.name,pop:r.population,percap,total_pool_usd:r.total_pool_usd,competitive_pool_usd:r.competitive_pool_usd,share,awards:s?s.awards:null,median:s?s.ev_median:null,max:s?s.ev_max:null,nights:s?s.nights:null,cpn,year:y,local,evtotal:s?s.ev_total:null};
  }).filter(bfPass);
}
(function(){
  const rs=document.getElementById('bf-region'), cs=document.getElementById('bf-county'); if(!rs) return;
  if(STATE!=='WA'){ const d=document.getElementById('bf-data'); if(d) d.checked=false; const lb=d&&d.closest('label'); if(lb) lb.lastChild.textContent=' only rows with award records'; }
  STATES[STATE].regions.filter(x=>x!=='Other').forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;rs.appendChild(o);});
  [...new Set(data.map(r=>r.county))].sort().forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x+' County';cs.appendChild(o);});
  const redraw=()=>{ if(typeof renderBenchTable==='function'){ renderBenchTable(); const n=benchRows().length; document.getElementById('bfcount').textContent=n+' jurisdiction'+(n===1?'':'s')+' match.'; } };
  document.querySelectorAll('#bfilt input,#bfilt select').forEach(el=>el.addEventListener('input',redraw));
  const set=(id,v)=>{const el=document.getElementById(id); if(el){ if(el.type==='checkbox') el.checked=v; else el.value=v; }};
  document.getElementById('bpreset').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return;
    ['bf-share','bf-open','bf-ev','bf-med','bf-max','bf-nights','bf-cpn','bf-pop','bf-percap'].forEach(id=>set(id,'')); set('bf-fp',''); set('bf-cycle',''); set('bf-data',STATE==='WA'); set('bf-prog',true);
    const p=b.dataset.p;
    if(p==='new'){ set('bf-share',40); set('bf-max',10000); set('bf-med',3000); benchSort={k:'competitive_pool_usd',dir:-1}; }
    if(p==='big'){ set('bf-max',25000); benchSort={k:'max',dir:-1}; }
    if(p==='eff'){ set('bf-nights',1000); set('bf-cpn',30); benchSort={k:'cpn',dir:1}; }
    if(p==='open'){ set('bf-share',75); set('bf-open',50000); benchSort={k:'share',dir:-1}; }
    if(p==='percap'){ set('bf-percap',25); set('bf-open',25000); set('bf-pop',25000); benchSort={k:'percap',dir:-1}; }
    if(p==='clear'){ set('bf-region',''); set('bf-county',''); set('bf-data',false); set('bf-prog',false); }
    redraw(); document.getElementById('benchTable').scrollIntoView({block:'start'}); });
})();
function renderBench(){
  benchDone=true;
  const rows=benchRows(); const bc=document.getElementById('bfcount'); if(bc) bc.textContent=rows.length+' jurisdictions match.';
  const has=rows.filter(x=>x.year).length;
  document.getElementById('benchNote').textContent = STATE!=='WA' ? `${STATES[STATE].name} has no statewide award series like Washington's JLARC reports${STATE==='OR'?' (HB 4148 starts one in 2027)':''}. Award figures here come from council minutes, budgets and program pages for ${has} of ${rows.length} jurisdictions shown, marked "local" in the awards column. Room nights are not reported in ${STATES[STATE].name}, so that column stays empty.` : has? `JLARC figures available for ${has} of ${rows.length} jurisdictions shown; the others have not been matched to a report yet. "$ per room night" is lodging tax awarded to events divided by the paid room nights those event recipients reported, a rough efficiency measure. Median and largest award are for event awards; the awards count includes marketing and facility awards.` : 'JLARC report data has not been loaded yet; award and room-night columns fill in once it is.';
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
  document.querySelector('#benchTable tbody').innerHTML=rows.map(x=>`<tr><td><a href="#j-${slug(x.r.name)}" data-detail="${esc(x.name)}">${esc(x.name)}</a></td>${n(x.pop!=null?x.pop.toLocaleString():null)}${n(x.percap!=null?'$'+(x.percap>=10?Math.round(x.percap):x.percap.toFixed(2)):null)}${n(x.total_pool_usd!=null?money(x.total_pool_usd):null)}${n(x.competitive_pool_usd!=null?money(x.competitive_pool_usd):null)}${n(x.share!=null?Math.round(x.share*100)+'%':null)}${n(x.awards!=null?x.awards+(x.year?' ('+x.year+(x.local?', local':'')+')':''):null)}${n(x.evtotal!=null?money(x.evtotal):null)}${n(x.median!=null?money(x.median):null)}${n(x.max!=null?money(x.max):null)}${n(x.nights!=null?Math.round(x.nights).toLocaleString():null)}${n(x.cpn!=null?'$'+Math.round(x.cpn):null)}</tr>`).join('');
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
    <p class="eyebrow2">${r.type==='county'?'County':(r.type==='district'?'Auditorium district':'City')} · ${esc(r.county)} County${r.competitive_pool_usd!=null?` · ${money(r.competitive_pool_usd)} open to applicants`:''}</p>
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
const EVENTS=STATE==='WA'?JSON.parse(document.getElementById('events').textContent):[];
if(STATE!=='WA'){ const t=document.querySelector('.tabs a[data-view=events]'); if(t) t.style.display='none'; }
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
document.addEventListener('click',e=>{const c=e.target.closest('[data-cmp]'); if(c){ e.preventDefault(); cmpSel=[c.dataset.cmp]; const lead=data.find(r=>r.name===c.dataset.cmp); cmpPeers(lead,'fund').forEach(r=>cmpAdd(r.name)); location.hash='#benchmarks'; setTimeout(()=>{cmpRender(); document.getElementById('cmpSec').scrollIntoView({block:'start'});},50); return; }
  const b=e.target.closest('[data-alt]'); if(b){e.preventDefault(); openAlt(b.dataset.alt);}});


function localOnlyHtml(r){
  const la=r.local_awards.years; const yrs=Object.keys(la).sort().reverse();
  const rows=yrs.map(y=>{const s=la[y];const amts=s.awards.map(a=>a.amount).filter(a=>typeof a==='number').sort((p,q)=>p-q);return `<tr class="loc"><td>${y}<span class="src">minutes</span></td><td>${s.awards.length||'–'}</td><td>${s.total!=null?money(s.total):'–'}</td><td>${amts.length?money(amts[Math.floor(amts.length/2)]):'–'}</td><td>${amts.length?money(amts[amts.length-1]):'–'}</td></tr>`;}).join('');
  return `<details><summary>Award history (local records) <span>${yrs.length} yr</span></summary><div class="awards"><button class="btn ghost2 small" data-detail="${esc(r.name)}">Every recipient, every year</button> <button class="btn ghost2 small" data-cmp="${esc(r.name)}">Compare with peers</button> <a class="btn ghost2 small" href="#report=${encodeURIComponent(r.name)}">Peer report</a><div class="tw"><table><thead><tr><th>Year</th><th>Awards</th><th>Total</th><th>Median</th><th>Largest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="top">From council and committee records; the state dataset has no rows for this jurisdiction.</div></div></details>`;
}
function localSection(r){
  const la=r.local_awards; if(!la||!la.years) return '';
  const yrs=Object.keys(la.years).sort().reverse();
  const blocks=yrs.map(y=>{const s=la.years[y];const rows=s.awards.slice().sort((p,q)=>(q.amount||0)-(p.amount||0)).map(a=>`<tr class="${a.dmo?'dim':''}"><td>${esc(a.recipient||'')}${a.dmo?' <span class="tag">jurisdiction / DMO</span>':''}</td><td>${esc(a.event||'')}</td><td class="num">${a.amount!=null?money(a.amount):'–'}</td><td class="meth">${esc(a.notes||'')}</td></tr>`).join('');
    return `<h4>${y} awards from council and committee records${s.total!=null?` · ${money(s.total)} total`:''}${s.decided?` · decided ${esc(String(s.decided))}`:''}</h4>${s.note?`<p class="hint2">${esc(s.note)}</p>`:''}${rows?`<div class="tw"><table class="dt"><thead><tr><th>Recipient</th><th>Event or project</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="hint2">Per-award list not published; only the total was found.</p>'}`;}).join('');
  return `${blocks}${la.upcoming?`<p class="hint2"><b>Coming cycle:</b> ${esc(la.upcoming)}</p>`:''}${la.not_found?`<p class="hint2">Not found: ${esc(la.not_found)}</p>`:''}<p class="hint2">Sources: ${(la.sources||[]).slice(0,8).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,'').slice(0,50))}</a>`).join(' · ')}</p>`;
}
function localDetailHtml(r){
  return `<div class="detail"><p class="eyebrow2">${r.type==='county'?'County':(r.type==='district'?'Auditorium district':'City')} · ${esc(r.county)} County</p><h3>${esc(r.name)}</h3><p class="hint2">The state dataset has no rows for ${esc(r.name)}; these awards come from local records. <a href="#j-${slug(r.name)}" onclick="closeModal()">Open the directory card</a>.</p>${localSection(r)}</div>`;
}

/* ================= other funding (grant catalog) ================= */
const GRANTS=JSON.parse(document.getElementById('grants').textContent).filter(g=>(g.state||'WA')===STATE);
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
    if(here.length) ltac=`<div class="gband fres"><h3>Lodging tax programs here</h3>${here.map(x=>{const s=status(x);return `<div class="fr gr"><h4><a href="#j-${slug(x.name)}">${esc(x.name)} lodging tax grants</a></h4><span class="score">${x.type==='county'?'County':(x.type==='district'?'District':'City')}</span><div class="why"><span class="gb ${s.key==='open'?'ok':''}">${s.label}${x.deadline?' · '+fmt(x.deadline):''}</span> ${x.competitive_pool_usd!=null?`<b>${money(x.competitive_pool_usd)} open to applicants</b>`:''} ${x.for_profit==='yes'?'<span class="gb ok">For-profit OK</span>':(x.for_profit==='sponsor'?'<span class="gb">Via fiscal sponsor</span>':'')}</div>${x.deadline_pattern?`<div class="why">${esc(x.deadline_pattern)}</div>`:''}</div>`;}).join('')}</div>`;
  }
  const bands=[['city','City programs'],['county','County programs'],['regional','Regional programs'],['statewide','Statewide and national programs']];
  const html=bands.map(([lv,t])=>{const L=list.filter(g=>g.level===lv); return L.length?`<div class="gband fres"><h3>${t} <span class="dimtxt">${L.length}</span></h3>${L.map(gCard).join('')}</div>`:'';}).join('');
  document.getElementById('grantRes').innerHTML=(ltac+html)||'<p class="empty">Nothing in the catalog matches. Loosen a filter.</p>';
}

/* ================= compare jurisdictions ================= */
let cmpSel=[], cmpEvOnly=false;
function cmpStats(r){
  const j=r.jlarc&&r.jlarc.years?r.jlarc.years:{}; const yrs=Object.keys(j).sort().reverse(); const y=yrs[0]; const s=y?j[y]:null;
  const la=r.local_awards&&r.local_awards.years?r.local_awards.years:{}; const lyrs=Object.keys(la).sort().reverse(); const ly=lyrs[0]; const ls=ly?la[ly]:null;
  const bt=s?s.bytype||{}:{}; const tot=s?s.total:null;
  const dmo=s?(s.recs||[]).filter(q=>q[1]==='M').reduce((a,q)=>a+(q[2]||0),0):null;
  const lamts=ls?ls.awards.map(a=>a.amount).filter(a=>typeof a==='number').sort((p,q)=>p-q):[];
  const lout=ls?ls.awards.filter(a=>!a.dmo&&typeof a.amount==='number').reduce((x,a)=>x+a.amount,0):null;
  const evOut=s?(s.recs||[]).filter(q=>q[1]==='E').reduce((x,q)=>x+(q[2]||0),0):null;
  const openEst=r.competitive_pool_usd!=null?r.competitive_pool_usd:(lout||evOut||null); const openSrc=r.competitive_pool_usd!=null?'':(lout?' (est., council records)':(evOut?' (est., state data)':''));
  const totEst=r.total_pool_usd!=null?r.total_pool_usd:(ls&&ls.total?ls.total:(tot||null));
  const lev=ls?ls.awards.filter(a=>!a.dmo&&typeof a.amount==='number').map(a=>a.amount).sort((p,q)=>p-q):[];
  const L=!s&&ls; // local-only record
  return {r,name:r.name,type:r.type,region:r.region,pop:r.population,county:r.county,perCap:r.population&&totEst?totEst/r.population:null,total:totEst,open:openEst,openSrc,share:totEst&&openEst!=null?Math.min(1,openEst/totEst):null,
    y:s?y:(L?ly:undefined),local:!!L,awards:s?s.awards:(L?ls.awards.length:null),ev_awards:s?s.ev_awards:(L?lev.length:null),jtotal:tot,ev_total:s?s.ev_total:(L&&lev.length?lev.reduce((a,b)=>a+b,0):null),ev_median:s?s.ev_median:(L&&lev.length?lev[Math.floor(lev.length/2)]:null),ev_max:s?s.ev_max:(L&&lev.length?lev[lev.length-1]:null),
    evshare:tot?(bt['Event/Festival']||0)/tot:null,mshare:tot?(bt['Marketing']||0)/tot:null,fshare:tot?(bt['Facility']||0)/tot:null,
    nights:s?s.nights:null,cpn:s&&s.nights&&s.ev_total?s.ev_total/s.nights:null,shared:s?s.shared_nights:null,fp:s?s.forprofit:null,
    ly,lawards:ls?ls.awards.length:null,ltotal:ls?ls.total:null,lmedian:lamts.length?lamts[Math.floor(lamts.length/2)]:null,lmax:lamts.length?lamts[lamts.length-1]:null,
    cycle:r.cycle,deadline:r.deadline,pres:r.presentation&&r.presentation.required,forprofit:r.for_profit};
}
function cmpFund(r){ const j=r.jlarc&&r.jlarc.years?r.jlarc.years:{}; const y=Object.keys(j).sort().reverse()[0]; const la=r.local_awards&&r.local_awards.years?r.local_awards.years:{}; const ly=Object.keys(la).sort().reverse()[0]; return Math.max(r.total_pool_usd||0, y?j[y].total||0:0, ly?la[ly].total||0:0, r.competitive_pool_usd||0); }
function cmpPeers(lead,mode){
  const pool=data.filter(r=>r!==lead&&(r.has_ltac_grants||r.jlarc||r.local_awards));
  if(mode==='county') return data.filter(r=>r!==lead&&r.county===lead.county).sort((a,b)=>cmpFund(b)-cmpFund(a)).slice(0,5);
  if(mode==='region') return pool.filter(r=>r.region===lead.region&&r.type===lead.type).sort((a,b)=>cmpFund(b)-cmpFund(a)).slice(0,5);
  if(mode==='pop'){ const p=lead.population; if(!p) return []; return pool.filter(r=>r.type===lead.type&&r.population).map(r=>({r,d:Math.abs(r.population-p)/p})).filter(x=>x.d<=0.4).sort((a,b)=>a.d-b.d).slice(0,5).map(x=>x.r); }
  const f=cmpFund(lead); if(!f) return [];
  return pool.filter(r=>r.type===lead.type).map(r=>({r,f:cmpFund(r)})).filter(x=>x.f&&Math.abs(x.f-f)/f<=0.4).sort((a,b)=>Math.abs(a.f-f)-Math.abs(b.f-f)).slice(0,5).map(x=>x.r);
}
function cmpAdd(name){ if(!name||cmpSel.includes(name)||cmpSel.length>=6) return; cmpSel.push(name); cmpRender(); }
function cmpRender(){
  const chips=document.getElementById('cmpChips'); chips.innerHTML=cmpSel.map((n,i)=>`<span class="chip ${i===0?'lead':''}">${esc(n)}<button type="button" data-rm="${esc(n)}" aria-label="Remove">×</button></span>`).join('');
  const out=document.getElementById('cmpOut');
  if(cmpSel.length<2){ out.innerHTML=cmpSel.length?'<p class="hint2">Add at least one more, or click "Add peers of the first".</p>':''; return; }
  const S=cmpSel.map(n=>cmpStats(data.find(r=>r.name===n)));
  const pct=v=>v==null?'–':Math.round(v*100)+'%'; const num=v=>v==null?'–':v.toLocaleString(); const m=v=>v==null?'–':money(v); const d=v=>v==null?'–':'$'+Math.round(v);
  const rows=[
    ['sec','Place'],
    ['County',S.map(s=>s.county),v=>v||'–'],
    ['Population',S.map(s=>s.pop),num],
    ['Lodging tax fund per resident',S.map(s=>s.perCap),v=>v==null?'–':'$'+(v>=10?Math.round(v):v.toFixed(2)),'hi'],
    ['sec','Fund'],
    ['Total lodging tax fund (documented, else latest year awarded)',S.map(s=>s.total),m,'hi'],
    ['Open to outside applicants',S.map(s=>s.open),m,'hi'],
    ['Basis for "open" figure',S.map(s=>s.open==null?'not published':(s.openSrc?s.openSrc.replace(/^ \(|\)$/g,''):'documented')),v=>v],
    ['Share of fund open',S.map(s=>s.share),pct,'hi'],
    ['sec','Awards (latest JLARC year)'],
    ['Year',S.map(s=>s.y),v=>v||'–'],
    ['Total awarded',S.map(s=>s.jtotal),m],
    ['Awards made',S.map(s=>s.awards),num],
    ['Event awards',S.map(s=>s.ev_awards),num,'hi'],
    ['Event dollars',S.map(s=>s.ev_total),m,'hi'],
    ['Median event award',S.map(s=>s.ev_median),m],
    ['Largest event award',S.map(s=>s.ev_max),m,'hi'],
    ['Awards to recipients that look like businesses',S.map(s=>s.fp),num],
    ['sec','Where the money goes'],
    ['Events and festivals',S.map(s=>s.evshare),pct,'hi'],
    ['Marketing and DMO contracts',S.map(s=>s.mshare),pct],
    ['Facilities',S.map(s=>s.fshare),pct],
    ['sec','Results reported by event recipients'],
    ['Paid room nights (deduplicated)',S.map(s=>s.nights),num,'hi'],
    ['Event dollars per room night',S.map(s=>s.cpn),d,'lo'],
    ['Nights from recipients also funded by neighbors',S.map(s=>s.shared),num],
    ['sec','Since the state data ended (council records)'],
    ['Year',S.map(s=>s.ly),v=>v||'–'],
    ['Awards listed',S.map(s=>s.lawards),num],
    ['Total',S.map(s=>s.ltotal),m],
    ['Median award',S.map(s=>s.lmedian),m],
    ['Largest award',S.map(s=>s.lmax),m,'hi'],
    ['sec','Process'],
    ['Cycle',S.map(s=>s.cycle),v=>v||'–'],
    ['Next deadline',S.map(s=>s.deadline),v=>v?fmt(v):'–'],
    ['Presentation required',S.map(s=>s.pres),v=>v===true?'yes':(v===false?'no':'–')],
    ['For-profit applicants',S.map(s=>s.forprofit),v=>({yes:'yes',sponsor:'via sponsor',no:'no'})[v]||'not stated'],
  ];
  const head=`<thead><tr><th></th>${S.map(s=>`<th><a href="#j-${slug(s.name)}">${esc(s.name)}</a></th>`).join('')}</tr></thead>`;
  const body=rows.map(row=>{ if(row[0]==='sec') return `<tr class="sec"><td colspan="${S.length+1}">${row[1]}</td></tr>`;
    const [label,vals,f,best]=row; let bi=-1; if(best){ const nums=vals.map((v,i)=>typeof v==='number'?[v,i]:null).filter(Boolean); if(nums.length>1){ nums.sort((a,b)=>best==='hi'?b[0]-a[0]:a[0]-b[0]); bi=nums[0][1]; } }
    return `<tr><td>${label}</td>${vals.map((v,i)=>`<td class="${i===bi?'best':''}">${f(v)}</td>`).join('')}</tr>`; }).join('');
  // merged award list
  const all=[]; S.forEach(s=>{ const j=s.r.jlarc&&s.r.jlarc.years?s.r.jlarc.years:{}; const y=Object.keys(j).sort().reverse()[0]; if(y) (j[y].recs||[]).forEach(q=>all.push({jur:s.name,year:y,recipient:q[0],type:q[1],amount:q[2],nights:q[3],others:q[8]||[]})); });
  if(cmpEvOnly) all.splice(0,all.length,...all.filter(a=>a.type==='E'));
  all.sort((a,b)=>(b.amount||0)-(a.amount||0));
  const shared={}; all.forEach(a=>{const k=a.recipient.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); (shared[k]=shared[k]||new Set()).add(a.jur);});
  const sharedList=Object.entries(shared).filter(([k,v])=>v.size>1).map(([k,v])=>{const rec=all.find(a=>a.recipient.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===k); return `<li><b>${esc(rec.recipient)}</b>: ${[...v].map(j=>{const x=all.find(a=>a.jur===j&&a.recipient.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===k);return esc(j)+' '+money(x.amount);}).join('; ')}</li>`;});
  const TYPEN2={E:'Event',M:'Marketing',F:'Facility'};
  const awardsTable=all.length?`<div class="tw"><table class="dt cmpawards"><thead><tr><th>Jurisdiction</th><th>Recipient</th><th>Type</th><th>Award</th><th>Paid nights</th><th>Also funded by</th></tr></thead><tbody>${all.slice(0,200).map(a=>`<tr class="${a.type==='E'?'':'dim'}"><td>${esc(a.jur)} ${a.year}</td><td>${esc(a.recipient)}</td><td>${TYPEN2[a.type]||'?'}</td><td class="num">${money(a.amount)}</td><td class="num">${a.nights!=null?a.nights.toLocaleString():'–'}</td><td>${a.others.map(esc).join(', ')}</td></tr>`).join('')}</tbody></table></div>${all.length>200?'<p class="hint2">Showing the 200 largest.</p>':''}`:'<p class="hint2">No state award rows for the selected programs.</p>';
  out.innerHTML=`<div class="tw"><table class="cmpt">${head}<tbody>${body}</tbody></table></div>
    <p class="hint2">Green marks the strongest value in each row (highest, or lowest for dollars per night). Room nights are recipients' own reports and are not audited; the state series ends at 2024.</p>
    ${sharedList.length?`<h4>Recipients funded by more than one of these</h4><ul class="flist">${sharedList.join('')}</ul>`:''}
    <div class="rowbtn"><button type="button" class="btn" id="cmpReportBtn">Build the peer report for ${esc(S[0].name)} against these</button> <span class="hint2">The first jurisdiction is the subject; the others are its peers.</span></div>
    <div id="cmpReport"></div>
    <h4>Every award, latest state year, all selected <label class="chk" style="font-weight:500;text-transform:none;letter-spacing:0;margin-left:10px"><input type="checkbox" id="cmpEv" ${cmpEvOnly?'checked':''}> events only</label> <button type="button" class="linkbtn" id="cmpLink">Copy link to this comparison</button></h4>${awardsTable}`;
  const rb=document.getElementById('cmpReportBtn'); if(rb) rb.addEventListener('click',()=>{ const lead=data.find(x=>x.name===cmpSel[0]); const peers=cmpSel.slice(1).map(n=>data.find(x=>x.name===n)).filter(Boolean); const box=document.getElementById('cmpReport'); box.innerHTML=reportHtml(lead,peers); box.scrollIntoView({block:'start'}); });
  const ev=document.getElementById('cmpEv'); if(ev) ev.addEventListener('change',()=>{cmpEvOnly=ev.checked;cmpRender();});
  const lk=document.getElementById('cmpLink'); if(lk) lk.addEventListener('click',()=>{const u=location.href.split('#')[0]+'#compare='+encodeURIComponent(cmpSel.join('|')); navigator.clipboard&&navigator.clipboard.writeText(u).then(()=>{lk.textContent='Link copied';setTimeout(()=>lk.textContent='Copy link to this comparison',1500);});});
}
(function(){
  const pick=document.getElementById('cmpPick'); if(!pick) return;
  data.filter(r=>r.has_ltac_grants||r.jlarc).sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{const o=document.createElement('option');o.value=r.name;o.textContent=r.name;pick.appendChild(o);});
  pick.addEventListener('change',()=>{cmpAdd(pick.value);pick.value='';});
  document.getElementById('cmpPeers').addEventListener('click',()=>{ if(!cmpSel.length){ document.getElementById('cmpOut').innerHTML='<p class="hint2">Pick a jurisdiction first.</p>'; return; } const lead=data.find(r=>r.name===cmpSel[0]); cmpPeers(lead,document.getElementById('cmpMode').value).forEach(r=>cmpAdd(r.name)); });
  document.getElementById('cmpClear').addEventListener('click',()=>{cmpSel=[];cmpRender();});
  document.getElementById('cmpChips').addEventListener('click',e=>{const b=e.target.closest('[data-rm]'); if(b){ cmpSel=cmpSel.filter(n=>n!==b.dataset.rm); cmpRender(); }});
  // deep link: #compare=A|B|C
  const h=location.hash; if(h.startsWith('#compare=')){ decodeURIComponent(h.slice(9)).split('|').forEach(cmpAdd); }
})();

/* ================= peer report ================= */
function pctile(arr,v){ const a=arr.filter(x=>typeof x==='number').sort((p,q)=>p-q); if(!a.length||v==null) return null; const below=a.filter(x=>x<v).length; return Math.round(below/a.length*100); }
function median(arr){ const a=arr.filter(x=>typeof x==='number').sort((p,q)=>p-q); if(!a.length) return null; return a[Math.floor(a.length/2)]; }
function reportHtml(r,peerList){
  const S=cmpStats(r); let peers=(peerList&&peerList.length?peerList:cmpPeers(r,'fund')); if(!(peerList&&peerList.length)&&peers.length<2) peers=cmpPeers(r,'pop'); if(!(peerList&&peerList.length)&&peers.length<2) peers=cmpPeers(r,'region'); if(!(peerList&&peerList.length)&&peers.length<3){ const f=cmpFund(r); const more=data.filter(x=>x!==r&&x.type===r.type&&(x.has_ltac_grants||x.jlarc||x.local_awards)&&cmpFund(x)>0&&!peers.includes(x)).sort((a,b)=>Math.abs(cmpFund(a)-f)-Math.abs(cmpFund(b)-f)); peers=peers.concat(more).slice(0,5); } peers=peers.slice(0,6); const PS=peers.map(cmpStats); const custom=!!(peerList&&peerList.length);
  const universe=data.filter(x=>x.type===r.type&&(x.has_ltac_grants||x.jlarc||x.local_awards)).map(cmpStats).filter(x=>x.y);
  const OR=STATE!=='WA'; const LAW={WA:'RCW 67.28.1816',OR:'ORS 320.350',ID:'Idaho Code 50-1044 and 67-4917'}[STATE];
  const j=r.jlarc&&r.jlarc.years?r.jlarc.years:{}; const yrs=Object.keys(j).sort(); const latest=yrs[yrs.length-1]; const s=latest?j[latest]:null;
  const m=v=>v==null?'–':money(v); const pct=v=>v==null?'–':Math.round(v*100)+'%'; const num=v=>v==null?'–':v.toLocaleString();
  const pm=k=>median(PS.map(p=>p[k])); const um=k=>median(universe.map(p=>p[k]));
  const rank=k=>{const p=pctile(universe.map(p=>p[k]),S[k]); return p==null?'':` (${ordinal(p)} percentile of ${universe.length} ${({county:'counties',district:'districts'}[r.type]||'cities')} with data)`;};
  function ordinal(n){ const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  const cmpWord=(v,ref,hiGood=true)=>{ if(v==null||ref==null) return null; const d=(v-ref)/ref; if(Math.abs(d)<0.1) return 'in line with'; return (d>0?'above':'below'); };
  // insights
  const ins=[];
  if(S.share!=null){ const ref=pm('share'); ins.push(`<li><b>${pct(S.share)} of the fund is open to outside applicants</b>${ref!=null?`, ${cmpWord(S.share,ref)} the peer median of ${pct(ref)}`:''}. ${S.share<0.3?'Most of the money is committed before applications open; applicants should know that, and the committee should say so in the guidelines.':(S.share>0.7?'This is an unusually open program; the risk is spreading money thin rather than too little competition.':'A typical split between standing contracts and a competitive round.')}</li>`); }
  else ins.push(`<li><b>No published figure for how much of the fund reaches outside applicants.</b> Peers that publish one average ${pct(pm('share'))} open. Publishing the number with the application is the single cheapest improvement available.</li>`);
  if(S.evshare!=null){ const ref=pm('evshare'); ins.push(`<li><b>${pct(S.evshare)} of ${latest} dollars went to events and festivals</b>, ${pct(S.mshare)} to marketing and DMO contracts, ${pct(S.fshare)} to facilities${ref!=null?`; peers put ${pct(ref)} into events`:''}. ${S.evshare<0.25?'Events are a small slice; if the council wants more measurable room nights, this is the lever.':''}</li>`); }
  if(S.ev_median!=null){ ins.push(`<li><b>The typical event award is ${m(S.ev_median)} and the largest ${m(S.ev_max)}</b>${rank('ev_max')}. ${pm('ev_max')!=null?`Peers: median ${m(pm('ev_median'))}, largest ${m(pm('ev_max'))}.`:''} ${S.ev_max&&pm('ev_max')&&S.ev_max<pm('ev_max')*0.6?'Awards run small; producers of larger events will apply elsewhere unless the program signals it can fund a headline event.':''}</li>`); }
  if(S.nights!=null){ ins.push(`<li><b>Funded events reported ${num(S.nights)} paid room nights</b> at ${S.cpn!=null?'$'+Math.round(S.cpn):'–'} of event money per night${rank('nights')}. Peers: ${num(pm('nights'))} nights at $${pm('cpn')!=null?Math.round(pm('cpn')):'–'} per night.${S.shared?` ${num(S.shared)} of those nights come from recipients also funded by neighboring jurisdictions, so the regional total is lower than the sum.`:''}${S.cpn!=null&&pm('cpn')!=null&&S.cpn>pm('cpn')*1.5?' Cost per night is high; ask recipients for direct counts (ticket ZIP codes, hotel block pickup) before next cycle.':''}</li>`); }
  if(yrs.length>=2){ const a=j[yrs[0]].total,b=j[latest].total; if(a&&b){ const g=(b-a)/a; ins.push(`<li><b>Total awards ${g>=0?'grew':'fell'} ${Math.round(Math.abs(g)*100)}% from ${yrs[0]} to ${latest}</b> (${m(a)} to ${m(b)}). ${g>0.3?'Growth that fast usually means a hotel opened or a reserve was drawn down; check that the award pace matches new collections.':(g<-0.2?'A falling total with a growing hotel base means balance is accumulating; applicants should ask what the reserve policy is.':'')}</li>`); } }
  if(S.perCap!=null){ const ref=pm('perCap'); ins.push(`<li><b>Lodging tax equals $${S.perCap>=10?Math.round(S.perCap):S.perCap.toFixed(2)} per resident</b>${ref!=null?`, ${cmpWord(S.perCap,ref)} peers at $${Math.round(ref)}`:''}${rank('perCap')}. ${S.perCap>50?'Visitors fund this program many times over what residents could; the committee has room to back outside events without crowding out local needs.':(S.perCap<8?'The fund is small relative to the city; expect applicants to compete with city departments, and expect the council to weigh resident benefit as much as room nights.':'')}</li>`); }
  if(s){ const top=(s.recs||[])[0]; if(top&&s.total&&top[2]/s.total>0.4) ins.push(`<li><b>${esc(top[0])} received ${pct(top[2]/s.total)} of all ${latest} dollars</b> (${m(top[2])}). One recipient at that scale should carry a written contract with deliverables and its own line in the report, separate from the competitive round.</li>`); }
  const fpPeers=peers.filter(p=>p.for_profit==='yes').length;
  ins.push(`<li><b>For-profit applicants: ${({yes:'eligible directly',sponsor:'eligible through a nonprofit sponsor',no:'not eligible under local rules'})[r.for_profit]||'eligibility not stated'}.</b> ${fpPeers} of ${peers.length} peers admit businesses directly. State law keys eligibility to the activity (tourism marketing, tourist-drawing events, tourism facilities), not to the applicant's tax status (${OR?LAW+'; the statute sets no nonprofit requirement':'RCW 67.28.1816; MRSC'}).</li>`);
  ins.push(`<li><b>Process: ${r.cycle==='rolling'?'rolling applications':(r.cycle==='semiannual'?'two or more rounds a year':'one annual round')}${r.deadline?`, next deadline ${fmt(r.deadline)}`:''}${r.presentation&&r.presentation.required?', presentation required':''}.</b> ${peers.filter(p=>p.pres).length} of ${peers.length} peers require presentations; ${peers.filter(p=>p.cycle==='rolling').length} take rolling applications.${!r.deadline&&r.has_ltac_grants?' No posted next deadline is the most common reason producers skip a program; post next year\'s window with this year\'s awards.':''}</li>`);
  // tables
  const row=(label,get,f)=>`<tr><td>${label}</td><td class="me">${f(get(S))}</td>${PS.map(p=>`<td>${f(get(p))}</td>`).join('')}<td class="med">${f(median(PS.map(get)))}</td></tr>`;
  const table=`<table class="cmpt rpt"><thead><tr><th></th><th class="me">${esc(r.name)}</th>${PS.map(p=>`<th><a href="#j-${slug(p.name)}">${esc(p.name)}</a></th>`).join('')}<th class="med">Peer median</th></tr></thead><tbody>
    ${row('Population',x=>x.pop,num)}${row('Fund per resident',x=>x.perCap,v=>v==null?'–':'$'+(v>=10?Math.round(v):v.toFixed(2)))}
    ${row('Total fund',x=>x.total,m)}${row('Open to applicants',x=>x.open,m)}${row('Share open',x=>x.share,pct)}
    ${row(OR?'Awards (latest local year)':'Awards (latest state year)',x=>x.awards,num)}${row('Event awards',x=>x.ev_awards,num)}${row('Event dollars',x=>x.ev_total,m)}${row('Median event award',x=>x.ev_median,m)}${row('Largest event award',x=>x.ev_max,m)}
    ${row('Events share',x=>x.evshare,pct)}${row('Marketing / DMO share',x=>x.mshare,pct)}${row('Facilities share',x=>x.fshare,pct)}
    ${row('Event room nights',x=>x.nights,num)}${row('Event $ per night',x=>x.cpn,v=>v==null?'–':'$'+Math.round(v))}
    ${row('2025/26 awards on record',x=>x.lawards,num)}${row('2025/26 largest award',x=>x.lmax,m)}
  </tbody></table>`;
  const trend=yrs.length?`<table class="cmpt rpt"><thead><tr><th>Year</th><th>Total awarded</th><th>Awards</th><th>Events</th><th>Marketing</th><th>Facilities</th><th>Event nights</th></tr></thead><tbody>${yrs.slice().reverse().map(y=>{const t=j[y];return `<tr><td>${y}</td><td>${m(t.total)}</td><td>${t.awards}</td><td>${m(t.bytype['Event/Festival']||0)}</td><td>${m(t.bytype['Marketing']||0)}</td><td>${m(t.bytype['Facility']||0)}</td><td>${num(t.nights)}</td></tr>`;}).join('')}</tbody></table>`:'<p class="hint2">No state award rows for this jurisdiction.</p>';
  const top5=s?(s.recs||[]).slice(0,8).map(q=>`<tr><td>${esc(q[0])}</td><td>${({E:'Event',M:'Marketing',F:'Facility'})[q[1]]||''}</td><td class="num">${m(q[2])}</td><td class="num">${q[3]!=null?q[3].toLocaleString():'–'}</td></tr>`).join(''):'';
  // ---- data-driven findings for the "do better" section ----
  const dg=r.diag||null; const ST=META.state||{}; const better=[]; const help=[];
  if(dg){
    if(dg.zero_nights&&dg.zero_nights.length) better.push(`<li><b>${dg.zero_nights.length} event award${dg.zero_nights.length>1?'s':''} of $10,000 or more reported no paid room nights in ${dg.year}</b> (${dg.zero_nights.slice(0,4).map(z=>esc(z[0])+' '+money(z[1])).join('; ')}${dg.zero_nights.length>4?'…':''}). ${STATE==='WA'?'Statewide that was $1.7M across 53 awards.':''} Either the report is missing or the event does not draw overnight visitors; ask before renewing.</li>`);
    if(dg.event_reports>=3){
      const ex=dg.exact/dg.event_reports, uh=dg.under_half/dg.event_reports, ov=dg.over_150/dg.event_reports;
      better.push(`<li><b>Of ${dg.event_reports} event reports with an estimate, ${dg.under_half} came in under half the projected room nights, ${dg.over_150} beat it by more than 50%, and ${dg.exact} matched the estimate to the night</b> (statewide: ${Math.round(ST.under_half_share*100)}%, ${Math.round(ST.over150_share*100)}% and ${Math.round(ST.exact_share*100)}%). ${ex>0.3?'Exact matches are copies, not counts; require a named direct count before the next renewal.':(uh>0.3?'More misses than typical; compare estimate to actual recipient by recipient before renewing.':'Within the normal range; keep reading estimate against actual each year.')}</li>`);
    }
    if(dg.no_estimate) better.push(`<li><b>${dg.no_estimate} of ${dg.event_awards} event awards carried no room-night estimate</b>, though RCW 67.28.1816(2)(a) requires one from every applicant. Make the estimate a required field and decline incomplete applications.</li>`);
    if(dg.weak_methods&&dg.event_awards&&dg.weak_methods/dg.event_awards>0.3) better.push(`<li><b>${dg.weak_methods} of ${dg.event_awards} event recipients counted visitors by informal survey or named no method.</b> Statewide, those reports miss by half 26 to 31% of the time against 21% for direct counts. Ticket ZIP codes, registrations and hotel block pickup are direct counts most producers can do.</li>`);
    if(dg.event_awards<=2&&S.awards>=3) better.push(`<li><b>Only ${dg.event_awards} of ${S.awards} awards in ${dg.year} went to events or festivals.</b> The typical program makes four event awards; this one is mostly standing contracts with an application form attached. If the council expects a competitive program, say how many awards it should make.</li>`);
    if(dg.top_event_share!=null&&dg.top_event_share>0.5) better.push(`<li><b>One recipient took ${Math.round(dg.top_event_share*100)}% of event dollars</b> (statewide median 33%). Fine if deliberate; if not, a cap per award or a reduced-award rule spreads the risk.</li>`);
    if(dg.growth_total&&dg.growth_event&&dg.growth_total>1.2&&dg.growth_event<1) better.push(`<li><b>Total awards grew ${Math.round((dg.growth_total-1)*100)}% from ${dg.first} to ${dg.year} while event dollars fell.</b> Growth in collections is flowing to standing contracts by default. A floor for the competitive pool, as a share of collections, keeps new money reaching new events.</li>`);
    if(S.shared&&S.nights&&S.shared/S.nights>0.3) better.push(`<li><b>${Math.round(S.shared/S.nights*100)}% of reported room nights come from recipients also funded by neighboring jurisdictions.</b> Each funder is paying for the same visitors and counting them again; agree with the county on who claims what before the next cycle.</li>`);
    if(S.cpn!=null&&S.cpn>ST.median_cpn*1.5) better.push(`<li><b>Event dollars per room night are $${Math.round(S.cpn)} against a statewide median of $${ST.median_cpn}.</b> Sports and participant events run about $${ST.sports_cpn}, one-day events $${ST.oneday_cpn}, multi-day $${ST.multiday_cpn}. Favoring multi-day and participant formats is the lever with the most effect.</li>`);
  }
  if(S.share!=null&&S.share<0.3) better.push(`<li><b>${Math.round(S.share*100)}% of the fund is open to applicants</b> against a ${OR?'Washington':'statewide'} median of ${Math.round(ST.median_share_open*100)}%. Applicants cannot tell this from the guidelines; publish the split, and set the competitive share on purpose.</li>`);
  if(!OR&&S.evshare!=null&&S.evshare<ST.events_share_of_dollars) better.push(`<li><b>${Math.round(S.evshare*100)}% of dollars go to events</b>, under the statewide ${Math.round(ST.events_share_of_dollars*100)}%, which is itself the smallest slice of the fund. Events are the only spending whose return can be measured; marketing contracts report county-wide nights that cannot be checked.</li>`);
  // what would help applicants
  if(r.competitive_pool_usd==null) help.push('Publish the fund total and the amount open to applicants on the program page every cycle. In Washington\'s state data 59% of applicants ask for exactly what they think is safe; without the number they ask low or not at all.');
  if(!r.deadline&&r.has_ltac_grants) help.push('Post next year\'s application window when this year\'s awards are announced. Producers plan 12 to 18 months out'+(OR?'':'; 54 of 128 Washington programs close in August to October')+', and an event that misses the window waits a year.');
  if(!(r.funding_docs||[]).some(x=>/award/i.test((x.type||x.doc_type||'')+(x.title||'')))) help.push('Publish the award list with the room nights each recipient reported. '+(OR?'Few '+STATES[STATE].name+' programs do':'Only 59 of 128 Washington programs do')+'; it is the strongest signal to a serious applicant of what the committee funds and at what size.');
  if(!(r.funding_docs||[]).some(x=>/rubric|scor|criteria|guideline/i.test((x.type||x.doc_type||'')+(x.title||'')))) help.push('Publish the scoring rubric with the application so applicants can self-score; '+(STATE==='OR'?'Salem and Hermiston publish theirs':(STATE==='ID'?'the Idaho Travel Council publishes its scoring criteria':'Lacey and Kittitas County are the models'))+'.');
  if(r.for_profit!=='yes') help.push('State in the guidelines that eligibility follows the activity (tourism marketing, tourist-drawing events, tourism facilities), and name a fiscal-sponsor route if the council prefers a nonprofit applicant of record. '+(STATE==='OR'?'Oregon law sets no nonprofit requirement, and Portland, Seaside and Roseburg fund businesses directly':(STATE==='ID'?'Idaho law sets no nonprofit requirement for local option tax grants':'38 Washington jurisdictions already fund business recipients at the same median award as nonprofits'))+'.');
  help.push('Ask every applicant for a reduced-award plan at two levels. In Washington\'s state data, 43% of requests over $15,000 are cut rather than declined, and the applicant who can scale is the one who gets funded.');
  help.push('Tell applicants which weekends the hotels are empty. Washington\'s room-night data shows multi-day and participant events book the most nights per dollar, and shoulder-season dates are where a small program moves its own hotel numbers.');
  if(!r.local_awards) help.push(OR?'Publish each year\'s award list on the program page; '+STATES[STATE].name+' has no statewide award series'+(STATE==='OR'?' until HB 4148 reporting starts in 2027':'')+', so unless the city publishes, applicants have nothing to size a request against.':'Report the current year\'s awards somewhere public; the state series ended in 2024 and 2025 reporting was suspended, so unless the city publishes, the record goes dark.');
  const recs=[];
  if(S.share==null||r.competitive_pool_usd==null) recs.push('Publish the fund total and the amount open to applicants with each application cycle.');
  if(S.evshare!=null&&S.evshare<0.25) recs.push('Set a target share of the fund for events and festivals and report against it each year.');
  if(!r.deadline&&r.has_ltac_grants) recs.push('Post next year\'s application window at the same time this year\'s awards are announced.');
  if(r.for_profit!=='yes') recs.push('State in the guidelines that eligibility follows the activity, and name a fiscal-sponsor route for businesses if the council prefers nonprofit applicants of record.');
  if(S.cpn!=null&&pm('cpn')!=null&&S.cpn>pm('cpn')*1.5) recs.push('Require a named counting method in every application and compare actuals to estimates before renewing an award.');
  if(S.shared) recs.push('Coordinate with neighboring jurisdictions on shared recipients so room nights are not counted twice in regional totals.');
  if(!(r.presentation&&r.presentation.required)) recs.push('Add a short applicant presentation; committees that hear applicants fund fewer surprises.');
  if(!r.local_awards) recs.push(OR?'Publish the award list for the current funding year on the program page; '+STATES[STATE].name+' has no statewide award series, so the public record otherwise does not exist.':'Publish the award list for the current funding year on the program page; the state series ended in 2024 and the public record otherwise goes dark.');
  return `<div class="report">
    <div class="rhead"><p class="eyebrow2">Lodging tax peer report · ${esc(r.county)} County · prepared ${fmt(META.asof)}</p><h2>${esc(r.name)}</h2>
      <p class="lede2">How ${esc(r.name)}'s lodging tax program compares with ${PS.length} ${custom?'selected jurisdictions':'jurisdictions of similar fund size'}${PS.length?` (${PS.map(p=>esc(p.name)).join(', ')})`:''} and with all ${universe.length} ${STATES[STATE].name} ${({county:'counties',district:'districts'}[r.type]||'cities')} with award data. Sources: the jurisdiction's own program documents, council and committee records${OR?' and adopted budgets ('+STATES[STATE].name+' has no statewide award series'+(STATE==='OR'?' until HB 4148 reporting begins in 2027':'')+'; latest local year '+(S.ly||'n/a')+')':', and the annual lodging tax reports filed with JLARC (latest year '+(latest||'n/a')+')'}.</p></div>
    <div class="rtiles">
      <div class="rt"><b>${m(S.total)}</b><span>total fund</span></div><div class="rt"><b>${m(S.open)}</b><span>open to applicants${S.openSrc?' (est.)':''}</span></div><div class="rt"><b>${pct(S.share)}</b><span>share open</span></div>
      <div class="rt"><b>${m(S.ev_max)}</b><span>largest event award</span></div><div class="rt"><b>${num(S.nights)}</b><span>event room nights</span></div><div class="rt"><b>${S.cpn!=null?'$'+Math.round(S.cpn):'–'}</b><span>event $ per night</span></div>
    </div>
    ${STATE==='OR'?'<p class="hint2">Oregon note: HB 4148 (2026) lowers the tourism share of post-2003 lodging tax from 70% to 50% for budgets starting Jan 1, 2027, adds resiliency grants as an allowed use, and starts biennial state reporting in September 2027. Councils deciding what to do with the freed 20% is the live question in most of these jurisdictions.</p>':''}
    <h3>What stands out</h3><ol class="rins">${ins.join('')}</ol>
    <h3>${custom?'Against the selected jurisdictions':'Against peers of similar fund size'}</h3><div class="tw">${table}</div>
    <h3>Three-year trend</h3><div class="tw">${trend}</div>
    ${top5?`<h3>Largest ${latest} recipients</h3><div class="tw"><table class="cmpt rpt"><thead><tr><th>Recipient</th><th>Type</th><th>Award</th><th>Paid nights reported</th></tr></thead><tbody>${top5}</tbody></table></div>`:''}
    ${better.length?`<h3>What could be done better</h3><ol class="rins">${better.join('')}</ol>`:''}
    ${help.length?`<h3>What would help applicants, and the committee</h3><ul class="rrec">${help.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}
    ${recs.length?`<h3>Also worth considering</h3><ul class="rrec">${recs.filter(x=>!help.some(h=>h.slice(0,25)===x.slice(0,25))).map(x=>`<li>${x}</li>`).join('')}</ul>`:''}
    <p class="hint2">Room nights are recipients' own reports to the jurisdiction and are not audited. "Peers" are ${custom?'the jurisdictions selected for this comparison':`the programs of the same type whose fund is within 40 percent of ${esc(r.name)}'s`}. Figures marked est. are derived from award lists where the jurisdiction publishes no pool total. Full detail for every number is on the directory card and in the Benchmarks tab at ${location.host||'the site'}.</p>
    <div class="rbtns noprint"><button type="button" class="btn" onclick="window.print()">Print or save as PDF</button> <button type="button" class="btn ghost2" data-cmp="${esc(r.name)}">Open in compare</button> <a class="btn ghost2" href="#j-${slug(r.name)}">Directory card</a></div>
  </div>`;
}
function showReport(name){ const r=data.find(x=>x.name===name); const el=document.getElementById('reportBody'); if(!r){ el.innerHTML='<p class="empty">Jurisdiction not found.</p>'; return; } el.innerHTML=reportHtml(r); document.getElementById('rp-pick').value=name; }
(function(){ const pick=document.getElementById('rp-pick'); if(!pick) return;
  data.filter(r=>r.has_ltac_grants||r.jlarc).sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{const o=document.createElement('option');o.value=r.name;o.textContent=r.name;pick.appendChild(o);});
  pick.addEventListener('change',()=>{ if(pick.value) location.hash='#report='+encodeURIComponent(pick.value); });
})();
