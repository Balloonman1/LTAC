import json,os,re,statistics,collections,glob
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
S=R+'build/'
ASOF='2026-10-30'
CITIES={"Seattle":[47.6062,-122.3321],"Bellevue":[47.6101,-122.2015],"SeaTac":[47.4435,-122.3017],"Spokane":[47.6588,-117.4260],"Tacoma":[47.2529,-122.4443],"Vancouver":[45.6387,-122.6615],"Redmond":[47.6740,-122.1215],"Kirkland":[47.6815,-122.2087],"Everett":[47.9790,-122.2021],"Tukwila":[47.4740,-122.2610],"Renton":[47.4829,-122.2171],"Lynnwood":[47.8209,-122.3151],"Federal Way":[47.3223,-122.3126],"Kent":[47.3809,-122.2348],"Bothell":[47.7623,-122.2054],"Issaquah":[47.5301,-122.0326],"Spokane Valley":[47.6732,-117.2394],"Kennewick":[46.2112,-119.1372],"Richland":[46.2857,-119.2845],"Pasco":[46.2396,-119.1006],"Yakima":[46.6021,-120.5059],"Wenatchee":[47.4235,-120.3103],"Leavenworth":[47.5962,-120.6615],"Ocean Shores":[46.9737,-124.1563],"Long Beach":[46.3523,-124.0543],"Olympia":[47.0379,-122.9007],"Lacey":[47.0343,-122.8232],"Bellingham":[48.7519,-122.4787],"Mount Vernon":[48.4212,-122.3341],"Burlington":[48.4757,-122.3255],"Port Angeles":[48.1181,-123.4307],"Walla Walla":[46.0646,-118.3430],"Chelan":[47.8407,-120.0162],"Ellensburg":[46.9965,-120.5478],"Poulsbo":[47.7359,-122.6465],"Auburn":[47.3073,-122.2285],"Puyallup":[47.1854,-122.2929],"Fife":[47.2393,-122.3571],"Lakewood":[47.1718,-122.5185],"Gig Harbor":[47.3295,-122.5801],"Tumwater":[47.0073,-122.9093],"Bremerton":[47.5673,-122.6329],"Port Orchard":[47.5404,-122.6363],"Bainbridge Island":[47.6262,-122.5212],"Sequim":[48.0795,-123.1018],"Port Townsend":[48.1170,-122.7604],"Forks":[47.9504,-124.3854],"Anacortes":[48.5126,-122.6127],"Oak Harbor":[48.2932,-122.6432],"Friday Harbor":[48.5343,-123.0170],"Westport":[46.8904,-124.1043],"Marysville":[48.0518,-122.1771],"Mukilteo":[47.9445,-122.3046],"Edmonds":[47.8107,-122.3774],"Shoreline":[47.7557,-122.3415],"Des Moines":[47.4018,-122.3243],"Woodinville":[47.7543,-122.1635],"North Bend":[47.4957,-121.7868],"Snoqualmie":[47.5287,-121.8254],"Cle Elum":[47.1954,-120.9392],"Moses Lake":[47.1301,-119.2781],"Pullman":[46.7313,-117.1796],"Centralia":[46.7162,-122.9543],"Aberdeen":[46.9754,-123.8157],"Longview":[46.1382,-122.9382],"Camas":[45.5871,-122.3995],"Winthrop":[48.4771,-120.1862],"Lynden":[48.9465,-122.4524],"Blaine":[48.9937,-122.7471],"Liberty Lake":[47.6730,-117.0852],"Stevenson":[45.6951,-121.8845]}

CITIES.update(json.load(open(S+'cities2.json')))
data=json.load(open(R+'data.json'))
def scrub(t):
    if not t: return t
    parts=re.split(r'(?<=[.;])\s+',t)
    keep=[p for p in parts if not re.search(r'balloon|glow',p,re.I)]
    return ' '.join(keep).strip() or None
for r in data:
    for a in r.get('alternatives') or []:
        for k in ('notes','eligibility','funds'):
            if a.get(k): a[k]=scrub(a[k])
REGION={'Puget Sound':['King','Pierce','Snohomish','Kitsap','Thurston','Island','Skagit','Whatcom','San Juan','Mason'],
 'Olympic Peninsula and Coast':['Clallam','Jefferson','Grays Harbor','Pacific'],
 'Southwest':['Clark','Cowlitz','Lewis','Skamania','Wahkiakum','Klickitat'],
 'North Central':['Chelan','Douglas','Okanogan','Grant','Kittitas'],
 'South Central':['Yakima','Benton','Franklin','Walla Walla','Columbia'],
 'Northeast':['Spokane','Stevens','Pend Oreille','Ferry','Lincoln','Whitman','Adams'],
 'Southeast':['Asotin','Garfield']}
C2R={c:r for r,cs in REGION.items() for c in cs}
for r in data: r['region']=C2R.get(r.get('county'),'Other')
for r in data: r.setdefault('verified','2026-10-29')

# ---- JLARC merge (optional) ----
jl=R+'jlarc/normalized.json'
def norm(n): return re.sub(r'\s+',' ',n.strip().lower().replace('city of ','').replace('town of ',''))
if os.path.exists(jl):
    rows=json.load(open(jl))
    byj={}
    for row in rows:
        k=norm(row.get('jurisdiction') or '')
        byj.setdefault(k,[]).append(row)
    biz=re.compile(r'\b(llc|inc\.?|corp|company|productions?|enterprises|ltd|co\.)\b',re.I)
    def nrec(n): return re.sub(r'[^a-z0-9]+',' ',(n or '').lower()).strip()
    # recipients funded by more than one jurisdiction in the same year (possible double counting of room nights)
    shared=collections.defaultdict(set)
    for row in rows:
        if row.get('recipient_is_jurisdiction'): continue
        shared[(row['year'],nrec(row.get('recipient')))].add(row.get('jurisdiction'))
    TYPE={'Event/Festival':'E','Marketing':'M','Facility':'F'}
    num=lambda v: v if isinstance(v,(int,float)) else None
    for r in data:
        k=norm(r['name']); rs=byj.get(k) or byj.get(k+' county') or byj.get(k.replace(' county',''))
        if not rs: continue
        years={}
        for y in sorted({str(x['year']) for x in rs if x.get('year')}):
            yr=[x for x in rs if str(x.get('year'))==y and not x.get('recipient_is_jurisdiction')]
            amts=[x['amount_awarded'] for x in yr if num(x.get('amount_awarded')) and x['amount_awarded']>0]
            if not amts: continue
            ev=[x for x in yr if x.get('activity_type')=='Event/Festival' and num(x.get('amount_awarded')) and x['amount_awarded']>0]
            evamts=[x['amount_awarded'] for x in ev]
            # dedupe nights: one recipient reporting the same figure on several awards counts once
            seen=set(); evn=[]; dup=0
            for x in ev:
                n=num(x.get('paid_lodging_nights'))
                if n is None: continue
                key=(nrec(x.get('recipient')),n)
                if key in seen: dup+=n; continue
                seen.add(key); evn.append(n)
            bytype={t:round(sum(x['amount_awarded'] for x in yr if x.get('activity_type')==t and num(x.get('amount_awarded')))) for t in TYPE}
            recs=[]; sh=[]; shn=0
            for x in sorted(yr,key=lambda t:-(num(t.get('amount_awarded')) or 0)):
                others=sorted(shared[(x['year'],nrec(x.get('recipient')))]-{x.get('jurisdiction')})
                recs.append([x.get('recipient') or '?',TYPE.get(x.get('activity_type'),'?'),round(num(x.get('amount_awarded')) or 0),num(x.get('paid_lodging_nights')),num(x.get('total_attendance')),num(x.get('attend_50_miles')),num(x.get('attend_out_of_state')),x.get('attendance_method') or '',others])
                if others and x.get('activity_type')=='Event/Festival' and num(x.get('paid_lodging_nights')):
                    kk=nrec(x.get('recipient'))
                    if kk not in [q[0] for q in sh]: sh.append([kk,x.get('recipient'),others,x['paid_lodging_nights']]); shn+=x['paid_lodging_nights']
            top=[{'recipient':q[0],'amount':q[2],'type':q[1]} for q in recs[:5]]
            fp=sum(1 for x in yr if biz.search(x.get('recipient') or ''))
            years[y]={'awards':len(amts),'total':round(sum(amts)),'median':round(statistics.median(amts)),'max':round(max(amts)),
                      'ev_awards':len(evamts),'ev_total':round(sum(evamts)),'ev_median':round(statistics.median(evamts)) if evamts else None,'ev_max':round(max(evamts)) if evamts else None,
                      'nights':round(sum(evn)) if evn else None,'nights_n':len(evn),'dup_nights':round(dup),'shared_nights':round(shn),'shared':[[q[1],q[2],q[3]] for q in sh],
                      'bytype':bytype,'top':top,'forprofit':fp,'recs':recs}
        if years: r['jlarc']={'years':years}
    print('jlarc matched',sum(1 for r in data if r.get('jlarc')))
else:
    print('no jlarc file yet')

# ---- 2025/2026 award lists from council minutes ----
loc={}
for f in sorted(glob.glob(R+'awards2526/out_*.json')):
    try: loc.update(json.load(open(f)))
    except Exception as ex: print('bad',f,ex)
nloc=0
for r in data:
    h=loc.get(r['name'])
    if not h or not h.get('years'): continue
    yrs={}
    for y,v in h['years'].items():
        if not isinstance(v,dict): continue
        aw=[a for a in (v.get('awards') or []) if isinstance(a,dict) and a.get('recipient')]
        if not aw and v.get('total') is None: continue
        amts=[a['amount'] for a in aw if isinstance(a.get('amount'),(int,float))]
        yrs[str(y)]={'total':v.get('total') if v.get('total') is not None else (round(sum(amts)) if amts else None),'decided':v.get('decided'),'note':v.get('note'),
                     'awards':[{'recipient':a.get('recipient'),'event':a.get('event'),'amount':a.get('amount'),'dmo':bool(a.get('to_jurisdiction_or_dmo')),'notes':a.get('notes')} for a in aw]}
    if yrs:
        r['local_awards']={'years':yrs,'sources':h.get('source_urls') or [],'upcoming':h.get('upcoming'),'not_found':h.get('not_found')}; nloc+=1
print('local award lists',nloc)
# ---- alternative-program award history ----
import glob
alt={}
for f in glob.glob(R+'altawards/[abc].json'):
    try: alt.update(json.load(open(f)))
    except Exception as ex: print('bad',f,ex)
hit=0
for r in data:
    for a in r.get('alternatives') or []:
        h=alt.get(a['program'])
        if h and h.get('awards'):
            a['awards_history']={k:h.get(k) for k in ('source_urls','cycles_found','total_awarded_latest','awards_count_latest','typical_award','awards','notes')}; hit+=1
print('alt programs with awards',hit)
css=open(S+'parts_css.txt').read()+open(S+'v2_extra.css').read()
law=open(S+'parts_law.txt').read()
body=open(S+'v2_body.html').read().replace('<!--LAW-->',law)
js=open(S+'parts_js.txt').read()
def rep(a,b):
    global js
    assert js.count(a)==1,a[:60]; js=js.replace(a,b)
rep('const TODAY = new Date("2026-10-29T12:00:00");','const META=JSON.parse(document.getElementById("meta").textContent);\nconst TODAY = new Date(META.asof+"T12:00:00");')
rep("      ${docs}\n      ${members}\n    </div>","      ${docs}\n      ${awardsHtml(r)}\n      ${members}\n    </div>\n    ${verifyHtml(r)}")
rep("  if(sortF==='name') return [0,0,r.name];","  if(sortF==='name') return [0,0,r.name];\n  if(sortF==='awards'){const j=r.jlarc;const y=j&&Object.keys(j.years||{}).sort().reverse()[0];return [0,-(y?j.years[y].awards:-1),r.name];}")
rep("document.getElementById('rail').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({block:'start'});t.classList.add('lead');}});","")
extra=open(S+'v2_extra.js').read()+'\nroute();\n'
geo=open(S+'geo/wa-counties.json').read()
libs=open(S+'libs/d3-array.min.js').read()+'\n'+open(S+'libs/d3-geo.min.js').read()+'\n'+open(S+'libs/topojson-client.min.js').read()
grants=[]
for f in sorted(glob.glob(R+'grants/*.json')):
    try: grants+=json.load(open(f))
    except Exception as ex: print('bad',f,ex)
# fold the directory's per-card alternative programs into the catalog (skipping LTAC programs and duplicates)
def gk(n): return ' '.join(t for t in re.sub(r'[^a-z0-9]+',' ',(n or '').lower()).split() if t not in ('and','the','of','grant','grants','program'))
# dedupe the researcher catalogs (same program found by both)
seen={}; dedup=[]
for g in grants:
    k=gk(g.get('name'))+'|'+gk((g.get('funder') or '')[:20])
    if k in seen:
        # keep the one with more deadlines / longer notes
        if len(g.get('deadlines') or [])+len(g.get('notes') or '')/200 > len(seen[k].get('deadlines') or [])+len(seen[k].get('notes') or '')/200: dedup[dedup.index(seen[k])]=g; seen[k]=g
        continue
    seen[k]=g; dedup.append(g)
grants=dedup
# second dedupe: near-identical names at the same level and place
STOPG2={'city','county','of','program','grant','grants','fund','the','and','cpf','rfp','tpa','seattle'}
out=[]
for g in grants:
    gt=set(gk(g.get('name')).split())-STOPG2
    dup=None
    for h in out:
        if h.get('level')!=g.get('level'): continue
        ht=set(gk(h.get('name')).split())-STOPG2
        if gt and ht and len(gt&ht)>=2 and len(gt&ht)/len(gt|ht)>=0.6 and ((h.get('geography') or {}).get('counties')==(g.get('geography') or {}).get('counties')): dup=h; break
    if dup:
        if len(g.get('deadlines') or [])>len(dup.get('deadlines') or []): out[out.index(dup)]=g
        continue
    out.append(g)
grants=out
have={gk(g.get('name')) for g in grants}
for r in data:
    for a in r.get('alternatives') or []:
        nm=a.get('program') or ''
        if re.search(r'lodging tax|hotel.motel|LTAC',nm,re.I) and not re.search(r'TPA|promotion area',nm,re.I): continue
        if gk(nm) in have: continue
        STOPG={'city','county','of','program','grant','grants','fund','the','and','cpf','rfp','tpa'}
        nt=set(gk(nm).split())-STOPG
        place=r['name'].lower()
        dup=False
        for g in grants:
            if g.get('from_directory'): continue
            geo=g.get('geography') or {}
            same_place=(r['name'] in (geo.get('cities') or [])) or (r['county'] in (geo.get('counties') or [])) or g.get('level')=='statewide'
            gt=set(gk(g.get('name')).split())-STOPG
            if same_place and nt and gt and len(nt&gt)>=2 and len(nt&gt)/len(nt|gt)>=0.4: dup=True; break
        if dup: continue
        have.add(gk(nm))
        el=(a.get('eligibility') or '')
        apps=[]
        if re.search(r'for-profit|business',el,re.I) and not re.search(r'not eligible|nonprofit only|501\(c\)\(3\) only',el,re.I): apps.append('for-profit')
        if re.search(r'nonprofit|501',el,re.I) or not el: apps.append('nonprofit')
        if re.search(r'public|city|cities|municipal|agency|tribe',el,re.I): apps.append('public agency')
        if re.search(r'individual|artist',el,re.I): apps.append('individual')
        if re.search(r'fiscal sponsor|partner with',el,re.I): apps.append('fiscal sponsor accepted')
        txt=' '.join(str(a.get(k) or '') for k in ('program','funds','eligibility','notes','deadline_pattern'))
        kinds=[k for k,pat in [('festival','festival|event'),('arts','arts|art '),('music','music|concert'),('cultural','cultur'),('heritage','heritage|histor'),('sports','sport|athlet|tournament'),('tourism marketing','marketing|promotion|tourism'),('community event','community'),('capital','capital|facilit')] if re.search(pat,txt,re.I)]
        rolling=bool(re.search(r'rolling|ongoing|year-round|any time|anytime',txt,re.I))
        dl=[{'date':a['deadline'],'label':'posted deadline'}] if a.get('deadline') else []
        h=a.get('awards_history') or {}
        rec=[{'recipient':x.get('recipient'),'amount':x.get('amount')} for x in (h.get('awards') or [])[:5]]
        grants.append({'name':nm,'funder':a.get('administrator'),'url':a.get('url'),'contact':a.get('contact'),'level':'county' if r['type']=='county' else 'city',
            'geography':{'counties':[r['county']] if r['type']=='county' else [],'cities':[] if r['type']=='county' else [r['name']],'region':''},
            'kinds':kinds or ['community event'],'applicants':apps,'award':a.get('funds'),'cycle':'rolling' if rolling else ('annual' if a.get('deadline') or a.get('deadline_pattern') else 'unknown'),'rolling':rolling,
            'deadlines':dl,'next_deadline':a.get('deadline'),'opens':a.get('deadline_pattern'),'match':None,'reimbursement':None,'notes':a.get('notes'),'recent_recipients':rec,
            'confidence':'medium','sources':[a['url']] if a.get('url') else [],'from_directory':True})
print('grants',len(grants))
gr=json.dumps(grants,separators=(',',':'),ensure_ascii=False).replace('</script','<\\/script')
evs=open(R+'jlarc/events.json').read().replace('</script','<\\/script')
meta=json.dumps({'asof':ASOF,'contact':'eliav@seattleballooning.com','cities':CITIES},separators=(',',':'))
dj=json.dumps(data,separators=(',',':'),ensure_ascii=False).replace('</script','<\\/script')
html=f'''<title>WA Lodging Tax Grants</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>{css}</style>
{body}
<script>{libs}</script>
<script id="meta" type="application/json">{meta}</script>
<script id="geo" type="application/json">{geo}</script>
<script id="events" type="application/json">{evs}</script>
<script id="grants" type="application/json">{gr}</script>
<script id="data" type="application/json">{dj}</script>
<script>{js}
{extra}</script>
'''
open(R+'ltac.html','w').write(html)
open(R+'index.html','w').write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Lodging tax (LTAC) grant deadlines, committees, award history and application tools for the 100 largest hotel-tax cities and counties in Washington.">\n'+html.replace('<style>','</head>\n<body>\n<style>',1)+'\n</body>\n</html>\n')
json.dump(data,open(R+'data.json','w'),separators=(',',':'),ensure_ascii=False)
print('built',len(html))
