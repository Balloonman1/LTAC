import json,re,collections
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
S=R+'build/'
rows=json.load(open(R+'jlarc/normalized.json'))
def nk(s):
    s=(s or '').lower()
    s=re.sub(r'\b(20\d\d|the|annual|\d+(st|nd|rd|th)|inc|llc)\b',' ',s)
    return re.sub(r'[^a-z0-9]+',' ',s).strip()
JUNK=re.compile(r'(^visitors? center|\b(advertis\w*|marketing|promotion\w*|tourism|visitors? center|staffing|shuttle|mosquito|operations?|operating|website|social media|chamber$|year round|multiple activities|events?$|activities|bundle|program|print|sponsorship\w*)\b)',re.I)
KEEP=re.compile(r'festival|fair\b|derby|parade|race|\brun\b|tournament|regatta|rodeo|show|market\b|concert|games|series|celebration|fest\b|days\b|week\b|championship|expo|ride|classic|marathon|triathlon|cup\b|glow|oktoberfest|christmas|holiday|lights|jam\b|rally|carnival|powwow|pow wow|half\b|10k|5k',re.I)
ev=[x for x in rows if x['activity_type']=='Event/Festival' and (x.get('total_attendance') or 0)>0]
g0=collections.defaultdict(list)
for x in ev: g0[(nk(x['recipient']),nk(x['activity_name']))].append(x)
# merge an organizer's variant names for the same event (e.g. "Tulip Festival" and "Skagit Valley Tulip Festival")
STOP={'and','of','in','at','a','for','on','with','to','event','events','festival','fest','city','county','town'}
byrec=collections.defaultdict(list)
for k in g0: byrec[k[0]].append(k)
g={}
for rec,keys in byrec.items():
    groups=[]
    for k in keys:
        t=set(k[1].split())-STOP
        placed=False
        for grp in groups:
            gt=grp['t']
            if t and gt and (t<=gt or gt<=t or len(t&gt)/len(t|gt)>=0.5): grp['keys'].append(k); grp['t']|=t; placed=True; break
        if not placed: groups.append({'t':set(t),'keys':[k]})
    for grp in groups:
        xs=[x for k in grp['keys'] for x in g0[k]]
        g[(rec,min(k[1] for k in grp['keys']))]=xs
num=lambda v: v if isinstance(v,(int,float)) else None
events=[]
for k,xs in g.items():
    cnt=collections.Counter(re.sub(r'\s+',' ',(x['activity_name'] or '').strip()) for x in xs)
    name=sorted(cnt,key=lambda n:(-cnt[n],len(n)))[0]
    name=re.sub(r'^(event|events)\s*[-:]\s*','',name,flags=re.I).strip()
    m=JUNK.search(nk(name))
    if m and (not KEEP.search(name) or m.start()<12): continue
    yrs={}
    for y in sorted({x['year'] for x in xs}):
        L=[x for x in xs if x['year']==y]
        mx=lambda f: max((num(x.get(f)) or 0) for x in L)
        yrs[str(y)]={'nights':mx('paid_lodging_nights'),'nights_pred':mx('paid_lodging_nights_predicted'),'att':mx('total_attendance'),'att_pred':mx('total_attendance_predicted'),
          'a50':mx('attend_50_miles'),'oos':mx('attend_out_of_state'),'paid_people':mx('overnight_paid'),'cost':mx('total_activity_cost'),
          'ltac':round(sum(num(x.get('amount_awarded')) or 0 for x in L)),'requested':round(sum(num(x.get('funds_requested')) or 0 for x in L)),
          'funders':[[x['jurisdiction'],round(num(x.get('amount_awarded')) or 0)] for x in sorted(L,key=lambda t:-(num(t.get('amount_awarded')) or 0))],
          'start':min((x.get('activity_start') or '9') for x in L),'end':max((x.get('activity_end') or '') for x in L),'method':L[0].get('attendance_method') or ''}
    latest=max(yrs); s=yrs[latest]
    events.append({'name':name,'org':xs[0]['recipient'],'org_is_gov':bool(xs[0].get('recipient_is_jurisdiction')),'latest':latest,'nights':s['nights'],'att':s['att'],'ltac':s['ltac'],
                   'ltac_3yr':sum(v['ltac'] for v in yrs.values()),'funders':sorted({x['jurisdiction'] for x in xs}),'county':None,'years':yrs,'key':list(k)})
# county lookup from directory data
data=json.load(open(R+'data.json'))
jc={r['name']:r['county'] for r in data}
for e in events:
    cs=sorted({jc[f] for f in e['funders'] if f in jc}); e['county']=cs[0] if len(cs)==1 else (', '.join(cs) if cs else None)
# ---- other funding: match statewide grant lists and alternative-program awards to organizers/events ----
import glob,os
other=[]
if os.path.exists(R+'altawards/other_funding.json'):
    try: other=json.load(open(R+'altawards/other_funding.json'))
    except Exception as ex: print('bad other_funding',ex)
for f in glob.glob(R+'altawards/[abc].json'):
    try: prog=json.load(open(f))
    except Exception as ex: print('bad',f,ex); continue
    for pname,h in prog.items():
        for a in h.get('awards') or []:
            other.append({'recipient':a.get('recipient'),'event':a.get('event'),'funder':h.get('jurisdiction') or '','program':pname,'year':a.get('year'),'amount':a.get('amount'),'kind':'grant','source_url':(h.get('source_urls') or [None])[0],'notes':a.get('notes')})
def toks(s): return set(nk(s).split())-STOP-{'association','foundation','society','club','committee','commission','chamber','commerce','valley','county','city','washington','wa','center','centre','inc'}
PLACE=set()
for j in json.load(open(R+'jlarc/compliance_2022_2024.json')): PLACE|=set(nk(j['jurisdiction']).split())
PLACE|={'island','islands','lake','mount','mt','valley','north','south','east','west','upper','lower','greater','puget','sound','olympic','peninsula','columbia','river','cascade','skagit','san','juan','orcas','whidbey','kitsap','pierce','snohomish','king','spokane','yakima','chelan','okanogan','clallam','jefferson','grays','harbor','pacific','lewis','cowlitz','clark','thurston','mason','whatcom','island','benton','franklin','walla','kittitas','grant','douglas','stevens','lincoln','adams','whitman','asotin','garfield','columbia','klickitat','skamania','wahkiakum','ferry','pend','oreille'}
matched=0
for e in events:
    et=toks(e['name']); ot=toks(e['org']); e['other']=[]
    for o in other:
        rt=toks(o.get('recipient') or ''); vt=toks(o.get('event') or '')
        def sim(a,b): return len(a&b)/len(a|b) if a and b else 0
        GEN={'children','museum','summer','concert','series','market','farmers','season','festival','fair','days','arts','art','music','community','center','park','parks','district','downtown','visit','tourism','bureau','board','events','event'}
        oc=(ot&rt)-GEN-PLACE; ec=(et&vt)-GEN-PLACE
        if (ot and rt and (ot==rt or (len(oc)>=2 and sim(ot,rt)>=0.6) or (len(oc)>=1 and (ot<=rt or rt<=ot) and min(len(ot),len(rt))>=2))) or (et and vt and len(ec)>=2 and sim(et,vt)>=0.75):
            e['other'].append({k:o.get(k) for k in ('funder','program','year','amount','kind','source_url','notes','recipient')})
    if e['other']: matched+=1
    e['other_total']=sum(x['amount'] for x in e['other'] if isinstance(x.get('amount'),(int,float)))
print('events with other funding matched',matched,'of',len(events),'from',len(other),'rows')
# ---- 2025/2026 lodging tax awards from council records, matched to event organizers ----
loc=[]
for f in sorted(glob.glob(R+'awards2526/out_*.json')):
    try:
        for jur,h in json.load(open(f)).items():
            for y,v in (h.get('years') or {}).items():
                if not isinstance(v,dict): continue
                for a in v.get('awards') or []:
                    if isinstance(a,dict) and a.get('recipient'): loc.append({'jurisdiction':jur,'year':str(y),'recipient':a['recipient'],'event':a.get('event'),'amount':a.get('amount')})
    except Exception as ex: print('bad',f,ex)
lm=0
for e in events:
    ot=toks(e['org']); et=toks(e['name']); e['local_ltac']=[]
    for o in loc:
        rt=toks(o['recipient']); vt=toks(o.get('event') or '')
        oc=(ot&rt)-GEN-PLACE; ec=(et&vt)-GEN-PLACE
        def sim(a,b): return len(a&b)/len(a|b) if a and b else 0
        if (ot and rt and (ot==rt or (len(oc)>=2 and sim(ot,rt)>=0.6) or (len(oc)>=1 and (ot<=rt or rt<=ot) and min(len(ot),len(rt))>=2))) or (et and vt and len(ec)>=2 and sim(et,vt)>=0.75):
            e['local_ltac'].append(o)
    if e['local_ltac']: lm+=1
print('events matched to 2025/26 local awards',lm,'from',len(loc),'rows')
events.sort(key=lambda e:-(e['nights'] or 0))
top=events[:400]
json.dump(top,open(R+'jlarc/events.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(events),'events;',len(top),'kept; bytes',len(json.dumps(top)))
for e in top[:25]: print(e['nights'],e['latest'],e['name'][:40],'|',e['org'][:28],'|',e['funders'],e['ltac'])
