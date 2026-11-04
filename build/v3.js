/* ================= v3: track record, funding plan, return calculator, library, drafting, change log ================= */
const TRACK=JSON.parse(document.getElementById('track').textContent);
function CH(){ return window.__CH||(window.__CH=JSON.parse(document.getElementById('changes').textContent)); }
const CHANGES=CH();
const LIB=JSON.parse(document.getElementById('library').textContent);
const ADR=JSON.parse(document.getElementById('adr').textContent);
VIEWS.push('plan','track','library');
let planDone=false, trackDone=false, libDone=false;
{ const _sv=showView; showView=function(v){ _sv(v); if(v==='plan'&&!planDone) initPlan(); if(v==='track'&&!trackDone) initTrack(); if(v==='library'&&!libDone) initLib(); if(v==='kit') initDraft(); }; }
{ const _rt=route; route=function(){ const h=(location.hash||'').replace('#',''); if(h.startsWith('track=')){ showView('track'); showTrack(decodeURIComponent(h.slice(6))); return; } _rt(); }; }
{ const g=document.querySelector('#g-city option[value=""]'); if(g) g.textContent='Anywhere in '+STATES[STATE].name; }
const num=v=>v==null||v===''?'–':Number(v).toLocaleString();
const pct=v=>v==null?'–':Math.round(v*100)+'%';
function jSel(sel,filter,label){ const el=typeof sel==='string'?document.getElementById(sel):sel; if(!el||el.dataset.filled) return el; el.dataset.filled=1;
  data.filter(filter||(()=>true)).slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{const o=document.createElement('option');o.value=r.name;o.textContent=label?label(r):r.name+(r.type==='city'?' ('+r.county+' County)':'');el.appendChild(o);}); return el; }

/* ---------- saving files (calendar) ---------- */
async function saveFile(name,text,mime){
  try{ const d=window.claude&&window.claude.use?await window.claude.use('downloads'):null; if(d){ await d.save({filename:name,data:new Blob([text],{type:mime})}); return true; } }catch(e){ if(e&&e.code==='declined') return false; }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:mime})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); return true; }catch(e){ return false; }
}
async function copyOut(text,msgEl,ok){ try{ await navigator.clipboard.writeText(text); if(msgEl) msgEl.textContent=ok||'Copied.'; }catch(e){ const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); try{document.execCommand('copy'); if(msgEl) msgEl.textContent=ok||'Copied.';}catch(x){ if(msgEl) msgEl.textContent='Copy failed; select the text and copy it.'; } t.remove(); } }

/* ================= change log ================= */
function chVal(label,v){ if(v==null||v==='') return 'not posted'; if(label==='Deadline'||label==='Presentation date') return fmt(v); if(label==='Open to applicants'||label==='Total fund') return money(v); if(label==='Open program') return v?'yes':'no'; if(label==='Committee roster') return v?v+' names':'none'; if(label==='Program page') return 'new link'; return String(v); }
function changesHtml(r){ const c=CH()[r.name]; if(!c||!c.length) return ''; return `<div class="chg"><b>Changed</b> ${c.slice(0,3).map(x=>`<span>${esc(x[1])}: ${esc(chVal(x[1],x[2]))} → ${esc(chVal(x[1],x[3]))} <i>${fmtShort(x[0])}</i></span>`).join('')}</div>`; }
(function(){
  const names=new Set(data.map(r=>r.name)); const all=[];
  for(const n in CHANGES){ if(!names.has(n)) continue; CHANGES[n].forEach(c=>all.push([n,...c])); }
  if(!all.length) return;
  all.sort((a,b)=>b[1].localeCompare(a[1])||a[0].localeCompare(b[0]));
  const w=document.getElementById('recentWrap'); if(!w) return; w.hidden=false;
  document.getElementById('recentN').textContent=all.length;
  document.getElementById('recentList').innerHTML=`<p class="hint2">Every change to a deadline, pool, cycle, roster or program status since the record was added, newest first.</p><div class="tablewrap"><table class="bench"><thead><tr><th>Date</th><th>Jurisdiction</th><th>What</th><th>Was</th><th>Now</th></tr></thead><tbody>${all.slice(0,120).map(x=>`<tr><td class="num">${fmtShort(x[1])}</td><td><a href="#j-${slug(x[0])}">${esc(x[0])}</a></td><td>${esc(x[2])}</td><td>${esc(chVal(x[2],x[3]))}</td><td>${esc(chVal(x[2],x[4]))}</td></tr>`).join('')}</tbody></table></div>`;
})();

/* ================= applicant track record ================= */
const T_KEY=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').replace(/\b(inc|llc|the|co|corp|corporation|ltd|dba)\b/g,' ').replace(/\s+/g,' ').trim();
let TGROUPS=null;
function tGroups(){ if(TGROUPS) return TGROUPS; const g={};
  TRACK.forEach(r=>{ const k=T_KEY(r[0]); if(!k) return; (g[k]=g[k]||{k,names:{},rows:[],total:0}); g[k].names[r[0]]=(g[k].names[r[0]]||0)+1; g[k].rows.push(r); g[k].total+=(+r[7]||0); });
  Object.values(g).forEach(x=>{ x.name=Object.entries(x.names).sort((a,b)=>b[1]-a[1])[0][0]; x.juris=[...new Set(x.rows.map(r=>r[1]))]; x.states=[...new Set(x.rows.map(r=>r[2]))]; x.acts=[...new Set(x.rows.map(r=>r[5]).filter(Boolean))]; });
  return TGROUPS=g; }
function tFind(q){ const k=T_KEY(q); if(!k) return []; const G=Object.values(tGroups());
  const exact=G.filter(x=>x.k===k); if(exact.length) return exact;
  const words=k.split(' ');
  return G.filter(x=>words.every(w=>x.k.includes(w))||x.acts.some(a=>words.every(w=>T_KEY(a).includes(w)))).sort((a,b)=>b.total-a.total).slice(0,25); }
function initTrack(){
  trackDone=true;
  const G=Object.values(tGroups()).sort((a,b)=>b.total-a.total);
  document.getElementById('t-list').innerHTML=G.slice(0,800).map(x=>`<option value="${esc(x.name)}">`).join('');
  const go=()=>{ const v=document.getElementById('t-q').value.trim(); if(v) location.hash='#track='+encodeURIComponent(v); };
  document.getElementById('t-go').addEventListener('click',go);
  document.getElementById('t-q').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } });
  const mine=G.filter(x=>x.states.includes(STATE)).slice(0,40);
  document.getElementById('trackTop').innerHTML=mine.length?`<div class="tablewrap"><table class="bench"><thead><tr><th>Organization</th><th>Total awarded</th><th>Awards</th><th>Funders</th><th>Years</th></tr></thead><tbody>${mine.map(x=>{const ys=[...new Set(x.rows.map(r=>r[3]).filter(Boolean))].sort();return `<tr><td><a href="#track=${encodeURIComponent(x.name)}">${esc(x.name)}</a></td><td class="num">${money(Math.round(x.total))}</td><td class="num">${x.rows.length}</td><td>${esc(x.juris.slice(0,4).join(', '))}${x.juris.length>4?' +'+(x.juris.length-4):''}</td><td>${ys.length?ys[0]+(ys.length>1?'–'+ys[ys.length-1]:''):''}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="empty">No award records for this state yet.</p>';
  const h=(location.hash||''); if(h.startsWith('#track=')) showTrack(decodeURIComponent(h.slice(7)));
}
function showTrack(q){
  if(!trackDone) initTrack();
  const inp=document.getElementById('t-q'); if(inp&&inp.value!==q) inp.value=q;
  const out=document.getElementById('trackOut'); const hits=tFind(q);
  if(!hits.length){ out.innerHTML=`<p class="empty">No award on record for "${esc(q)}". Try a shorter part of the name, or the event's name.</p>`; return; }
  if(hits.length>1&&T_KEY(hits[0].name)!==T_KEY(q)){ out.innerHTML=`<div class="fres"><h3>${hits.length} organizations match</h3>${hits.map(x=>`<div class="fr"><h4><a href="#track=${encodeURIComponent(x.name)}">${esc(x.name)}</a></h4><span class="score">${money(Math.round(x.total))}</span><div class="why">${x.rows.length} award${x.rows.length===1?'':'s'} · ${esc(x.juris.slice(0,5).join(', '))}${x.acts.length?' · '+esc(x.acts.slice(0,3).join('; ')):''}</div></div>`).join('')}</div>`; return; }
  const x=hits[0]; const rows=x.rows.slice().sort((a,b)=>(b[3]||0)-(a[3]||0)||String(a[1]).localeCompare(String(b[1])));
  const ev=rows.filter(r=>r[8]>0&&r[9]!=null);
  const ratios=ev.map(r=>r[9]/r[8]).sort((a,b)=>a-b);
  const medR=ratios.length?ratios[Math.floor(ratios.length/2)]:null;
  const exact=ev.filter(r=>r[9]===r[8]).length, under=ev.filter(r=>r[9]<r[8]*0.5).length, over=ev.filter(r=>r[9]>r[8]*1.5).length;
  const nightsTot=rows.reduce((s,r)=>s+(+r[9]||0),0); const evDollars=rows.filter(r=>r[9]>0).reduce((s,r)=>s+(+r[7]||0),0);
  const flag=r=>{ if(!(r[8]>0)||r[9]==null) return ''; if(r[9]===r[8]) return '<span class="gb warn">same as estimate</span>'; if(r[9]<r[8]*0.5) return '<span class="gb hot">under half</span>'; if(r[9]>r[8]*1.5) return '<span class="gb ok">beat estimate</span>'; return ''; };
  const T={E:'Event',M:'Marketing',F:'Facility',O:'Other'};
  const reading=[];
  if(ev.length){
    reading.push(`<li>${ev.length} report${ev.length===1?'':'s'} carry both an estimate and an actual. Reported room nights ran at a median of <b>${pct(medR)}</b> of the estimate.</li>`);
    if(exact) reading.push(`<li><b>${exact} report${exact===1?'':'s'} list actual room nights identical to the estimate.</b> Across Washington about 20% of event reports do this; it usually means no count was taken. Ask how the number was produced.</li>`);
    if(under) reading.push(`<li><b>${under} came in under half the estimate.</b> Ask what changed and whether the method changed.</li>`);
    if(over) reading.push(`<li>${over} beat the estimate by more than half.</li>`);
    const meth=[...new Set(ev.map(r=>r[12]).filter(Boolean))]; if(meth.length) reading.push(`<li>Counting methods used: ${esc(meth.join(', '))}.</li>`);
    if(nightsTot&&evDollars) reading.push(`<li>Across the awards that reported nights: ${money(Math.round(evDollars))} for ${Math.round(nightsTot).toLocaleString()} paid room nights, about <b>$${Math.round(evDollars/nightsTot)}</b> per night${META.state&&META.state.median_cpn?` (Washington event median: $${META.state.median_cpn})`:''}.</li>`);
  } else reading.push('<li>No reports with both an estimated and an actual room-night figure. Rows from council records carry award amounts only.</li>');
  if(x.juris.length>1) reading.push(`<li>Funded by ${x.juris.length} jurisdictions. Where two of them fund the same event in the same year, each may be counting the same room nights.</li>`);
  out.innerHTML=`<div class="trk"><div class="trkhead"><h3>${esc(x.name)}</h3><button class="btn ghost2 small" id="t-share" type="button">Copy link</button></div>
    <div class="rtiles"><div class="rt"><b>${money(Math.round(x.total))}</b><span>awarded on record</span></div><div class="rt"><b>${rows.length}</b><span>awards</span></div><div class="rt"><b>${x.juris.length}</b><span>funding jurisdiction${x.juris.length===1?'':'s'}</span></div><div class="rt"><b>${medR!=null?pct(medR):'–'}</b><span>actual vs. estimated nights (median)</span></div></div>
    <h4>How to read this record</h4><ul class="rins">${reading.join('')}</ul>
    <div class="tablewrap"><table class="bench trkt"><thead><tr><th>Year</th><th>Jurisdiction</th><th>Activity</th><th>Type</th><th>Asked</th><th>Awarded</th><th>Nights est.</th><th>Nights reported</th><th></th><th>Method</th></tr></thead><tbody>
    ${rows.map(r=>`<tr class="${r[13]==='L'?'loc':''}"><td>${r[3]||''}${r[13]==='L'?'<span class="src">minutes</span>':''}</td><td>${esc(r[1])}${r[2]!==STATE?' <span class="dimtxt">'+r[2]+'</span>':''}</td><td>${esc(r[5]||'')}</td><td>${T[r[4]]||''}</td><td class="num">${r[6]!=null?money(r[6]):'–'}</td><td class="num">${r[7]!=null?money(r[7]):'–'}</td><td class="num">${num(r[8])}</td><td class="num">${num(r[9])}</td><td>${flag(r)}</td><td>${esc(r[12]||'')}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="hint2">Room nights are the recipient's own figures as reported to the funding jurisdiction; they are not audited. Names are matched loosely, so an organization that changed its name may appear twice; search the event name to catch both. See <a href="#guidelines" data-goto="counting">how to count room nights</a>.</p></div>`;
  document.getElementById('t-share').addEventListener('click',e=>copyOut(location.href,null).then(()=>{e.target.textContent='Link copied';}));
}
document.addEventListener('click',e=>{ const a=e.target.closest('[data-goto]'); if(!a) return; setTimeout(()=>{ const t=document.getElementById(a.dataset.goto); if(t) t.scrollIntoView({block:'start'}); },60); });

/* ================= return on a grant ================= */
function regionAdr(r){ const R=(ADR.regions||{})[STATE]||{}; const x=(r&&R[r.region])||null; if(x&&x.adr) return {adr:x.adr,basis:'region',label:(x.basis||'').startsWith('city:')?x.basis.slice(5)+' average':r.region+' average',year:x.year};
  const s=R._statewide; if(s&&s.adr) return {adr:s.adr,basis:'statewide',label:'statewide average',year:s.year};
  const vals=Object.entries(R).filter(([k,v])=>k!=='_statewide'&&v&&v.adr); if(vals.length){ const m=vals.reduce((a,[,v])=>a+v.adr,0)/vals.length; return {adr:m,basis:'blend',label:'average of published '+STATES[STATE].name+' figures ('+vals.map(([k])=>k).join(', ')+'); no published rate for '+(r?r.region:'this region'),year:null}; }
  return {adr:150,basis:'none',label:'placeholder; '+STATES[STATE].name+' publishes no regional room rate, so enter your hotels\' rate',year:null}; }
function roiCalc(grant,nights,adr,rate,r){
  if(!(grant>0)||!(nights>0)||!(adr>0)||!(rate>0)) return '<p class="hint2">Fill in all four numbers.</p>';
  const rev=nights*adr, tax=rev*rate/100, ratio=tax/grant, be=grant/(adr*rate/100), per=adr*rate/100;
  const orNote=STATE==='OR'?`<li>In Oregon at least 70% of a post-2003 local lodging tax goes to tourism, so about <b>${money(Math.round(tax*0.7))}</b> of this lands back in tourism money (${money(Math.round(tax*0.5))} where a council uses HB 4148 to move to 50% from January 1, 2027). The state's 1.5% lodging tax goes to Travel Oregon, not the local fund.</li>`:'';
  const idNote=STATE==='ID'?'<li>In Idaho the resort city or auditorium district rate stays local. The separate 2% state travel and convention tax sends 45% back to the region as Idaho Travel Council grants, about 0.9% of room revenue.</li>':'';
  const waNote=STATE==='WA'?'<li>In Washington the first 2% of the special hotel/motel tax is credited against state sales tax, so it is money the city keeps either way; the additional rate is new money. Both go to the lodging tax fund.</li>':'';
  return `<div class="rtiles"><div class="rt"><b>${money(Math.round(tax))}</b><span>lodging tax generated</span></div><div class="rt"><b>${ratio>=10?Math.round(ratio):ratio.toFixed(1)}×</b><span>tax back per grant dollar</span></div><div class="rt"><b>${Math.ceil(be).toLocaleString()}</b><span>nights to break even</span></div><div class="rt"><b>$${Math.round(grant/nights)}</b><span>grant per paid night</span></div></div>
  <ul class="rins"><li>${nights.toLocaleString()} paid room nights at $${Math.round(adr)} is ${money(Math.round(rev))} in room revenue. At ${rate}% local lodging tax, each night returns $${per.toFixed(2)} to the fund.</li>
  <li>${ratio>=1?`The grant pays for itself in lodging tax alone, ${ratio.toFixed(1)} times over.`:`Lodging tax alone returns ${pct(ratio)} of the grant; the event needs ${Math.ceil(be).toLocaleString()} paid nights to break even on lodging tax.`} This leaves out visitor spending on meals, fuel and retail, and the sales tax it brings.</li>${orNote}${waNote}${idNote}</ul>`;
}
function roiFill(r){ if(!r) return; const a=regionAdr(r); if(a) document.getElementById('r-adr').value=Math.round(a.adr); document.getElementById('r-rate').value=r.rate_pct||4; }
function roiDraw(){ const g=+document.getElementById('r-grant').value, n=+document.getElementById('r-nights').value, a=+document.getElementById('r-adr').value, t=+document.getElementById('r-rate').value; const r=data.find(x=>x.name===document.getElementById('r-where').value);
  document.getElementById('roiOut').innerHTML=`<p class="hint2" id="roiAdrNote"></p>`+roiCalc(g,n,a,t,r); if(r){ const ad=regionAdr(r); document.getElementById('roiAdrNote').textContent=`Default room rate: ${ad.label}${ad.year?', '+ad.year:''}. Default tax rate from ${r.name}'s card${r.rate_pct?'':' (none listed there; 4% assumed)'}.`; } }

/* ================= funding plan ================= */
const iso=d=>d.toISOString().slice(0,10);
const addDays=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); };
function leadDays(text,def){ const t=String(text||''); let m=t.match(/(\d+)\s*(?:-|to)?\s*(?:\d+\s*)?(day|week|month)s?\s*(?:before|in advance|prior|ahead|lead)/i)||t.match(/at least\s+(\d+)\s*(day|week|month)/i); if(!m) return def; const n=+m[1]; return m[2].toLowerCase().startsWith('w')?n*7:m[2].toLowerCase().startsWith('m')?n*30:n; }
function ltacDeadlineFor(r,ev){
  if(r.cycle==='rolling'){ const L=leadDays([r.deadline_pattern,r.notes].join(' '),60); return {date:addDays(ev,-L),kind:'rolling',note:`Rolling; apply at least ${L} days before the event`}; }
  if(!r.deadline) return {date:null,kind:'unknown',note:r.deadline_pattern||r.typical_open||'Next date not posted; ask staff'};
  const step=r.cycle==='biennial'?2:1; const cands=[]; let d=r.deadline;
  while(daysUntil(d)>-400) { cands.push(d); d=addYear(d,-step); }
  d=addYear(r.deadline,step); for(let i=0;i<4;i++){ cands.push(d); d=addYear(d,step); }
  const ok=cands.filter(c=>daysUntil(c)>=0 && new Date(c)<=new Date(addDays(ev,-45))).sort();
  if(r.cycle==='semiannual'&&ok.length) return {date:ok[ok.length-1],kind:'deadline',projected:ok[ok.length-1]!==r.deadline,note:'Two or more rounds a year; confirm which round covers your dates'};
  if(ok.length){ const pick=ok[ok.length-1]; const gap=(new Date(ev)-new Date(pick))/864e5; return {date:pick,kind:'deadline',projected:pick!==r.deadline,note:gap>400?'This round is more than a year before the event; it may fund an earlier year. Check the funding year.':(r.funding_year?'Last posted round funded '+r.funding_year:'')}; }
  const next=cands.filter(c=>daysUntil(c)>=0).sort()[0];
  return {date:null,kind:'missed',note:next?`The round that would fund this date has passed or closes too close to the event; next deadline ${fmt(next)}${next!==r.deadline?' (projected)':''}`:'Round closed'};
}
function grantDeadlineFor(g,ev){
  if(g.rolling){ const L=leadDays([g.notes,g.opens,g.award].join(' '),90); return {date:addDays(ev,-L),kind:'rolling',note:`Rolling; apply at least ${L} days before the event`}; }
  const ds=[...new Set([g.next_deadline,...(g.deadlines||[]).map(d=>d.date)].filter(Boolean))].sort();
  const ok=ds.filter(c=>daysUntil(c)>=0 && new Date(c)<=new Date(addDays(ev,-30)));
  if(ok.length) return {date:ok[0],kind:'deadline',note:''};
  const fut=ds.filter(c=>daysUntil(c)>=0);
  if(fut.length) return {date:null,kind:'missed',note:`Next deadline ${fmt(fut[0])} is too close to or after the event`};
  return {date:null,kind:'unknown',note:g.opens?('Next date not posted. '+String(g.opens)):'Next date not posted'};
}
function askFor(r,goal,nights){
  const S=cmpStats(r); const lo=S.ev_median||S.lmedian, hi=S.ev_max||S.lmax; let txt=[];
  if(lo&&hi) txt.push(`Typical event award ${money(lo)}, largest ${money(hi)}`);
  let sug=null;
  if(lo&&hi){ sug=[lo,Math.round((lo+hi)/2/500)*500]; if(goal) sug=[Math.min(sug[0],goal),Math.min(sug[1],goal)]; txt.push(`ask ${money(sug[0])} to ${money(sug[1])}`); }
  if(nights&&META.state&&META.state.median_cpn&&STATE==='WA') txt.push(`at the state median of $${META.state.median_cpn} per paid night, ${nights.toLocaleString()} nights supports about ${money(Math.round(nights*META.state.median_cpn/500)*500)}`);
  if(r.competitive_pool_usd) txt.push(`${money(r.competitive_pool_usd)} open to applicants`);
  return {text:txt.join('; '),sug};
}
let PLAN=null;
function initPlan(){
  planDone=true;
  jSel('p-where'); jSel('r-where');
  try{ const s=JSON.parse(localStorage.getItem('ltac-plan')||'null'); if(s) for(const k in s){ const el=document.getElementById(k); if(el){ if(el.type==='checkbox') el.checked=s[k]; else el.value=s[k]; } } }catch(e){}
  document.getElementById('planForm').addEventListener('submit',e=>{e.preventDefault(); buildPlan();});
  ['r-where','r-grant','r-nights','r-adr','r-rate'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{ if(id==='r-where') roiFill(data.find(x=>x.name===document.getElementById('r-where').value)); roiDraw(); }));
  roiDraw();
  if(document.getElementById('p-where').value&&document.getElementById('p-date').value) buildPlan();
}
function buildPlan(){
  const v=id=>document.getElementById(id).value; const ids=['p-name','p-date','p-where','p-kind','p-app','p-budget','p-goal','p-att','p-nights','p-sponsor'];
  try{ const s={}; ids.forEach(i=>{const el=document.getElementById(i); s[i]=el.type==='checkbox'?el.checked:el.value;}); localStorage.setItem('ltac-plan',JSON.stringify(s)); }catch(e){}
  const ev=v('p-date'), r=data.find(x=>x.name===v('p-where')); const out=document.getElementById('planOut');
  if(!ev||!r){ out.innerHTML='<p class="empty">Pick the event date and where it happens.</p>'; return; }
  if(daysUntil(ev)<0){ out.innerHTML='<p class="empty">That date has passed. Enter the next edition\'s date.</p>'; return; }
  const kind=v('p-kind'), app=v('p-app'), goal=+v('p-goal')||0, nights=+v('p-nights')||0, sponsor=document.getElementById('p-sponsor').checked, name=v('p-name')||'the event';
  // lodging tax programs
  const local=[r].concat(data.filter(x=>x!==r&&x.county===r.county&&(x.type==='county'||x.type==='district'))).filter(x=>x.has_ltac_grants);
  const nearby=data.filter(x=>x!==r&&!local.includes(x)&&x.county===r.county&&x.has_ltac_grants);
  const items=[];
  local.forEach(x=>{ const d=ltacDeadlineFor(x,ev); if(x.for_profit==='no'&&app==='for-profit'&&!sponsor) return; const a=askFor(x,goal,nights);
    items.push({name:x.name+' lodging tax',who:x.type==='county'?'County':(x.type==='district'?'District':'City'),url:x.url,link:'#j-'+slug(x.name),d,ask:a.text,sug:a.sug,elig:x.for_profit==='yes'?'For-profit OK':(x.for_profit==='sponsor'?'Through a nonprofit sponsor':(x.for_profit==='no'?'Nonprofit or public only':'')),pres:x.presentation&&x.presentation.required?'Presentation required'+(x.presentation.pattern?': '+x.presentation.pattern:''):'',lt:true}); });
  // catalog grants
  const cityName=r.type==='city'?r.name:null;
  GRANTS.filter(g=>g.cycle!=='closed'&&(g.level==='national'||gApplies(g,cityName,r.county,r.region))).filter(g=>{
    const k=g.kinds||[]; if(kind&&k.length&&!k.includes(kind)&&!(kind==='cultural'&&k.includes('heritage'))&&!(kind==='festival'&&(k.includes('community event')||k.includes('arts')))&&!(kind==='community event'&&k.includes('festival'))) return false;
    const a=g.applicants||[]; if(!a.length) return true;
    if(app==='for-profit') return a.includes('for-profit')||(sponsor&&(a.includes('fiscal sponsor accepted')||a.includes('nonprofit')));
    if(app==='public agency') return a.includes('public agency')||a.includes('tribe');
    return a.includes('nonprofit')||a.includes('fiscal sponsor accepted');
  }).forEach(g=>{ const d=grantDeadlineFor(g,ev); items.push({name:g.name,who:g.funder||gWhere(g),url:g.url,d,ask:g.award||'',elig:(g.applicants||[]).includes('for-profit')?'For-profit OK':((g.applicants||[]).includes('fiscal sponsor accepted')?'Via fiscal sponsor':''),pres:'',lt:false,level:g.level}); });
  const can=items.filter(i=>i.d.date&&daysUntil(i.d.date)>=0).sort((a,b)=>a.d.date.localeCompare(b.d.date));
  const later=items.filter(i=>!i.d.date&&i.d.kind==='unknown');
  const missed=items.filter(i=>i.d.kind==='missed'||(i.d.date&&daysUntil(i.d.date)<0));
  PLAN={name,ev,where:r.name,can};
  const row=i=>`<tr class="${i.lt?'lt':''}"><td class="num">${i.d.date?fmt(i.d.date):'–'}${i.d.date?`<div class="dimtxt">${daysUntil(i.d.date)} days</div>`:''}</td><td>${i.url?`<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>`:esc(i.name)}${i.link?` <a class="dimtxt" href="${i.link}">card</a>`:''}<div class="dimtxt">${esc(i.who||'')}${i.elig?' · '+esc(i.elig):''}${i.pres?' · '+esc(i.pres):''}</div></td><td>${esc(i.ask||'')}</td><td class="dimtxt">${esc(i.d.note||'')}${i.d.projected?' (projected from last year)':''}</td></tr>`;
  const sugTotal=can.filter(i=>i.sug).reduce((s,i)=>s+i.sug[0],0);
  const roi=nights?(()=>{const a=regionAdr(r); const rate=r.rate_pct||4; const tax=nights*a.adr*rate/100; return `<p class="hint2">At about $${Math.round(a.adr)} a night and ${rate}% local lodging tax, ${nights.toLocaleString()} paid nights return about <b>${money(Math.round(tax))}</b> in lodging tax to ${esc(r.name)} (${money(Math.round(nights*a.adr))} in room revenue for local hotels). ${tax>=goal?'That covers the whole amount you hope to raise; say so in every lodging tax application.':'Put the room revenue and the tax figure in every lodging tax application; committees weigh both.'}${a.basis==='none'?' (Room rate is a placeholder; use your hotels\' rate.)':''}</p>`;})():'';
  out.innerHTML=`<div class="plan"><div class="trkhead"><h3>Funding plan: ${esc(name)}, ${fmt(ev)}</h3><span class="noprint"><button class="btn small" id="p-ics" type="button">Add deadlines to calendar</button> <button class="btn ghost2 small" id="p-copy" type="button">Copy plan</button> <button class="btn ghost2 small" type="button" onclick="window.print()">Print</button> <span id="p-msg" class="hint2"></span></span></div>
    <div class="rtiles"><div class="rt"><b>${can.length}</b><span>deadlines you can still make</span></div><div class="rt"><b>${can.filter(i=>i.lt).length}</b><span>lodging tax rounds</span></div><div class="rt"><b>${can.length?fmt(can[0].d.date):'–'}</b><span>first deadline</span></div><div class="rt"><b>${sugTotal?money(sugTotal):'–'}</b><span>lodging tax at typical award sizes</span></div></div>
    ${roi}
    ${can.length?`<h4>Apply in this order</h4><div class="tablewrap"><table class="bench plant"><thead><tr><th>Apply by</th><th>Program</th><th>What it gives</th><th>Notes</th></tr></thead><tbody>${can.map(row).join('')}</tbody></table></div>`:'<p class="empty">No posted deadline lands before the event. Check the rows below for programs whose next date is not posted yet.</p>'}
    ${later.length?`<details><summary>Dates not posted yet (${later.length})</summary><div class="tablewrap"><table class="bench plant"><tbody>${later.map(row).join('')}</tbody></table></div></details>`:''}
    ${missed.length?`<details><summary>Too late for this date (${missed.length})</summary><div class="tablewrap"><table class="bench plant"><tbody>${missed.map(row).join('')}</tbody></table></div></details>`:''}
    ${nearby.length?`<p class="hint2">Other lodging tax programs in ${esc(r.county)} County (${nearby.map(x=>`<a href="#j-${slug(x.name)}">${esc(x.name)}</a>`).join(', ')}) generally fund events held inside their limits; apply there if part of the event, lodging partners or marketing reach them.</p>`:''}
    <p class="hint2">Rolling programs show the latest safe date to apply. "Projected" dates repeat last year's deadline and must be confirmed with staff. Ask sizes come from each program's own recent awards.</p></div>`;
  document.getElementById('p-ics').addEventListener('click',async()=>{ const ok=await saveFile(slug(name||'event')+'-funding-deadlines.ics',planIcs(),'text/calendar'); document.getElementById('p-msg').textContent=ok?'Calendar file ready.':'Download blocked; use Copy plan instead.'; });
  document.getElementById('p-copy').addEventListener('click',()=>copyOut(planText(),document.getElementById('p-msg'),'Plan copied.'));
  document.getElementById('r-where').value=r.name; if(goal) document.getElementById('r-grant').value=Math.max(500,Math.round((can.find(i=>i.sug)||{sug:[goal]}).sug[0])); if(nights) document.getElementById('r-nights').value=nights; roiFill(r); roiDraw();
}
function planText(){ if(!PLAN) return ''; return `Funding plan: ${PLAN.name}, ${fmt(PLAN.ev)} (${PLAN.where})\n\n`+PLAN.can.map(i=>`${fmt(i.d.date)}  ${i.name}${i.ask?' | '+i.ask:''}${i.d.note?' | '+i.d.note:''}${i.url?'\n  '+i.url:''}`).join('\n')+`\n\nBuilt with ${location.origin&&location.origin!=='null'?location.origin+location.pathname:'the Lodging Tax Grants site'}`; }
function planIcs(){
  const z=s=>String(s||'').replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n'); const d8=s=>s.replace(/-/g,''); const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  const ev=[];
  PLAN.can.forEach((i,n)=>{ const end=d8(addDays(i.d.date,1));
    ev.push(['BEGIN:VEVENT',`UID:ltac-${n}-${d8(i.d.date)}-${slug(i.name).slice(0,40)}@lodgingtaxgrants`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d8(i.d.date)}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${z('Due: '+i.name)}`,`DESCRIPTION:${z([PLAN.name,i.ask,i.d.note,i.url].filter(Boolean).join('\n'))}`,i.url?`URL:${i.url}`:'','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-P14D',`DESCRIPTION:${z('Two weeks to '+i.name)}`,'END:VALARM','END:VEVENT'].filter(Boolean).join('\r\n'));
    const st=addDays(i.d.date,-21); if(daysUntil(st)>=0) ev.push(['BEGIN:VEVENT',`UID:ltac-start-${n}-${d8(st)}@lodgingtaxgrants`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d8(st)}`,`DTEND;VALUE=DATE:${d8(addDays(st,1))}`,`SUMMARY:${z('Start application: '+i.name)}`,`DESCRIPTION:${z('Due '+fmt(i.d.date)+'. '+(i.url||''))}`,'END:VEVENT'].join('\r\n'));
  });
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lodging Tax Grants//Funding plan//EN','CALSCALE:GREGORIAN',`X-WR-CALNAME:${z('Funding deadlines: '+PLAN.name)}`,...ev,'END:VCALENDAR'].join('\r\n');
}

/* ================= model document library ================= */
function initLib(){
  libDone=true;
  const cats=[...new Set(LIB.map(x=>x.category))]; const cs=document.getElementById('l-cat'); cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cs.appendChild(o);});
  ['l-cat','l-state','l-who'].forEach(id=>document.getElementById(id).addEventListener('change',drawLib));
  const counts={}; ALLDATA.forEach(r=>(r.funding_docs||[]).forEach(d=>{const t=d.type||d.doc_type||'other'; counts[t]=(counts[t]||0)+1;}));
  const tot=Object.values(counts).reduce((a,b)=>a+b,0);
  document.getElementById('libAll').textContent=`Beyond these picks, the directory links ${tot.toLocaleString()} documents from jurisdiction cards: ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>v+' '+k).join(', ')}. Open any card's documents list to see them.`;
  drawLib();
}
function drawLib(){
  const c=document.getElementById('l-cat').value, s=document.getElementById('l-state').value, w=document.getElementById('l-who').value;
  const L=LIB.filter(x=>(!c||x.category===c)&&(!s||x.state===s||x.state==='multi')&&(!w||x.best_for===w||x.best_for==='all'));
  if(!LIB.length){ document.getElementById('libOut').innerHTML='<p class="empty">The library is being compiled.</p>'; return; }
  const by={}; L.forEach(x=>(by[x.category]=by[x.category]||[]).push(x));
  document.getElementById('libOut').innerHTML=Object.keys(by).length?Object.entries(by).map(([k,xs])=>`<div class="gband fres"><h3>${esc(k)} <span class="dimtxt">${xs.length}</span></h3>${xs.map(x=>`<div class="fr gr"><h4><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></h4><span class="score">${esc(x.state==='multi'?'Multi-state':x.state)}</span><div class="why"><b>${esc(x.jurisdiction||'')}</b>${x.year?' · '+esc(x.year):''}${x.best_for?' · for '+esc(x.best_for):''}</div><div class="why">${esc(x.why||'')}</div></div>`).join('')}</div>`).join(''):'<p class="empty">Nothing matches. Loosen a filter.</p>';
}

/* ================= application drafting ================= */
let draftDone=false;
function initDraft(){
  if(draftDone) return; draftDone=true;
  jSel('d-where',r=>r.has_ltac_grants);
  document.getElementById('d-copy').addEventListener('click',()=>{ const p=draftPrompt(); if(!p) return; copyOut(p,document.getElementById('d-msg'),'Prompt copied. Paste it into Claude at claude.ai.'); });
  document.getElementById('d-go').addEventListener('click',runDraft);
}
function draftPrompt(){
  const v=id=>document.getElementById(id).value.trim(); const r=data.find(x=>x.name===v('d-where')); const msg=document.getElementById('d-msg');
  if(!r){ msg.textContent='Pick the program first.'; return null; }
  if(!v('d-desc')){ msg.textContent='Describe the event first.'; return null; }
  const docs=(r.funding_docs||[]).filter(d=>/guideline|application|rubric|criteria|scor|resolution|policy/i.test((d.type||d.doc_type||'')+' '+(d.title||''))).slice(0,6).map(d=>`- ${d.title}${d.summary?': '+d.summary:''} (${d.url})`).join('\n');
  const S=cmpStats(r);
  const law={WA:'RCW 67.28.1816 (lodging tax may fund tourism marketing, tourism-related facilities, and the marketing and operations of special events and festivals designed to attract tourists; applicants must estimate visitors, people traveling 50+ miles, overnight stays and paid lodging nights)',OR:'ORS 320.300 and 320.350 (tourism promotion and tourism-related facilities; no nonprofit requirement in statute)',ID:'Idaho Code 50-1044 to 50-1049 for resort city local option taxes (uses set by the city ordinance and ballot question) or 67-4901 et seq. for auditorium districts'}[STATE];
  return `Draft a lodging tax grant application for the program below. Write in plain, direct language a committee member can skim. Do not use em dashes. Use only the numbers I give; where a number or fact is missing, write [ADD: what is needed] instead of inventing it. Answer the program's own priorities first.

PROGRAM
${r.name} (${STATES[STATE].name}) lodging tax grants
Program page: ${r.url||'not listed'}
How it works: ${r.notes||''}
Deadline pattern: ${r.deadline_pattern||'not posted'}
Pool: ${r.pool_note||(r.competitive_pool_usd?money(r.competitive_pool_usd)+' open to applicants':'not published')}
Typical event award: ${S.ev_median||S.lmedian?money(S.ev_median||S.lmedian):'unknown'}; largest: ${S.ev_max||S.lmax?money(S.ev_max||S.lmax):'unknown'}
Applicant eligibility: ${({yes:'businesses may apply directly',sponsor:'businesses apply through a nonprofit or public sponsor',no:'nonprofit or public applicants only'})[r.for_profit]||'not stated'}
Presentation: ${r.presentation&&r.presentation.required?'required'+(r.presentation.pattern?', '+r.presentation.pattern:''):'not stated as required'}
Governing law: ${law}
Program documents:
${docs||'- none linked'}

EVENT
Name: ${v('d-name')||'[ADD: event name]'}
Dates: ${v('d-dates')||'[ADD: dates]'}
Applicant: ${v('d-app')}
Amount requested: ${v('d-ask')?'$'+Number(v('d-ask')).toLocaleString():'[ADD: amount]'}
Expected attendance: ${v('d-att')||'[ADD]'}
Share traveling 50+ miles: ${v('d-far')?v('d-far')+'%':'[ADD]'}
Expected paid room nights: ${v('d-nights')||'[ADD]'}
Description: ${v('d-desc')}

WRITE THESE SECTIONS
1. Event summary (3 to 4 sentences)
2. Tourism impact: attendance, visitors from 50+ miles, overnight visitors, paid room nights, and exactly how each will be counted after the event (name the method: ticketing or registration ZIP codes, hotel room block pickup, survey sample size)
3. Out-of-area marketing plan: channels, markets, timing, and how lodging tax dollars are used
4. How the event fits this program's stated priorities (quote or name the priority)
5. Budget and use of funds, plus a reduced-award plan at 50% and 75% of the request
6. Post-event reporting: what will be reported and when
7. Three questions the committee is likely to ask, with short answers`;
}
async function runDraft(){
  const p=draftPrompt(); if(!p) return; const out=document.getElementById('draftOut'), msg=document.getElementById('d-msg');
  let sample=null; try{ sample=window.claude&&window.claude.use?await window.claude.use('sample'):null; }catch(e){}
  if(!sample){ copyOut(p,msg,'Drafting runs inside the Claude version of this page. The full prompt is copied: paste it into Claude at claude.ai.'); out.innerHTML=`<p class="hint2">Prompt copied. <a href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude</a> and paste it.</p>`; return; }
  msg.textContent='Drafting…'; out.innerHTML='<div class="draft"></div>'; const box=out.firstChild;
  try{ const res=await sample(p,{modelTier:'default',onText:u=>{ box.innerHTML=draftHtml(u.text); }}); box.innerHTML=draftHtml(res.text); msg.textContent='Draft ready. Check every number before you submit.';
    out.insertAdjacentHTML('beforeend','<div class="cmpbar"><button class="btn ghost2 small" id="d-copyout" type="button">Copy draft</button></div>'); document.getElementById('d-copyout').addEventListener('click',()=>copyOut(res.text,msg,'Draft copied.'));
  }catch(e){ msg.textContent=e&&e.code==='not_granted'?'Drafting was not allowed in this view. The prompt is copied instead.':'Drafting stopped: '+(e&&e.message||'error')+'. The prompt is copied instead.'; copyOut(p,null); }
}
function draftHtml(t){ return esc(t||'').split('\n').map(l=>/^#{1,4}\s/.test(l)?`<h4>${l.replace(/^#+\s*/,'')}</h4>`:(/^\s*[-*]\s/.test(l)?`<p class="li">${l.replace(/^\s*[-*]\s/,'• ')}</p>`:(l.trim()?`<p>${l.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</p>`:''))).join(''); }
