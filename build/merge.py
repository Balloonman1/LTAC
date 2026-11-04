import json,html,glob,re,os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
B=R+'build/'
def fix(o):
    if isinstance(o,str): return html.unescape(o).strip()
    if isinstance(o,list): return [fix(x) for x in o]
    if isinstance(o,dict): return {k:fix(v) for k,v in o.items()}
    return o
out=[]
for i in range(1,11):
    out+=fix(json.load(open(f'{B}batches/batch{i}.json')))
out.append(fix(json.load(open(B+'poulsbo.json'))))
import os
for f in sorted(glob.glob(B+'batches/batch_x*.json')):
    try: out+=fix(json.load(open(f)))
    except Exception as ex: print('bad',f,ex)
for r in out: r['state']='WA'
WA_NAMES={r['name'] for r in out}|{r['name']+' County' for r in out if r['type']=='county' and not r['name'].endswith('County')}
for f in sorted(glob.glob(B+'batches/or_*.json'))+sorted(glob.glob(B+'batches/id_*.json')):
    try: recs=fix(json.load(open(f)))
    except Exception as ex: print('bad',f,ex); continue
    ST='ID' if os.path.basename(f).startswith('id_') else 'OR'
    for r in recs:
        r['state']=ST
        if r.get('type')=='county' and not r['name'].endswith('County'): r['name']+=' County'
        if r['name'] in WA_NAMES: r['name']=r['name']+(', Oregon' if ST=='OR' else ', Idaho')
        r['_or']=True
        la=r.get('local_awards')
        if isinstance(la,dict) and la.get('years'):
            yrs={}
            for y,v in la['years'].items():
                if not isinstance(v,dict): continue
                aw=[a for a in (v.get('awards') or []) if isinstance(a,dict) and a.get('recipient')]
                if not aw and v.get('total') is None: continue
                amts=[a['amount'] for a in aw if isinstance(a.get('amount'),(int,float))]
                yrs[str(y)]={'total':v.get('total') if v.get('total') is not None else (round(sum(amts)) if amts else None),'decided':v.get('decided'),'note':v.get('note'),
                    'awards':[{'recipient':a.get('recipient'),'event':a.get('event'),'amount':a.get('amount'),'dmo':bool(a.get('to_jurisdiction_or_dmo',a.get('dmo'))),'notes':a.get('notes')} for a in aw]}
            r['local_awards']={'years':yrs,'sources':la.get('sources') or la.get('source_urls') or [],'upcoming':la.get('upcoming'),'not_found':la.get('not_found') or la.get('note')} if yrs else None
        else: r['local_awards']=None
    out+=recs
alts={a['name']:a['alternatives'] for a in fix(json.load(open(B+'altA.json'))+json.load(open(B+'altB.json')))}
alias={'Chelan':'City of Chelan'}
for r in out:
    r.setdefault('presentation',{"required":None,"date":None,"pattern":None,"format":None})
    r.setdefault('meeting_schedule',None); r.setdefault('members',[]); r.setdefault('alternatives',[]); r.setdefault('funding_docs',[])
    if r.get('funding_year') is not None: r['funding_year']=str(r['funding_year'])
    k=alias.get(r['name'],r['name'])
    if not r['has_ltac_grants'] and k in alts and not r['alternatives']: r['alternatives']=alts[k]
    if r['has_ltac_grants'] in (False,None): r['has_ltac_grants']=False; r['cycle']='none'
    if isinstance(r.get('presentation'),dict): r['presentation'].setdefault('date',None); r['presentation'].setdefault('required',None)
    else: r['presentation']={'required':None,'date':None,'pattern':None,'format':None}
    if r['name']=='Auburn': r['cycle']='semiannual'
    r.setdefault('total_pool_usd',None); r.setdefault('competitive_pool_usd',None); r.setdefault('pool_note',None)
    if r['name']=='Walla Walla': r['competitive_pool_usd']=0
    if r.get('cycle') in ('quarterly',): r['cycle']='semiannual'
    if r.get('cycle') not in ('annual','semiannual','rolling','biennial','none'): print('bad cycle',r['name'],r.get('cycle')); r['cycle']='annual'
    r.setdefault('deadline',None); r.setdefault('funding_year',None); r.setdefault('members_as_of',None); r.setdefault('verified','2026-10-30' if r.get('name') not in () else None)
    for d in ('deadline',):
        if r[d] and not re.match(r'^\d{4}-\d{2}-\d{2}$',str(r[d])): r[d]=None
    r['county']=re.sub(r'\s+County$','',r['county'] or '')
    if r['type']=='county' and not r['name'].endswith('County') and not r['name'].endswith(', Oregon') and not r['name'].endswith(', Idaho'): r['name']+=' County'
    for d in (r['deadline'],r['presentation'].get('date'),r['members_as_of']):
        if d and not re.match(r'^\d{4}-\d{2}-\d{2}$',d): print('bad date',r['name'],d)
fp=json.load(open(B+'fp.json'))
for r in out:
    r['for_profit']=r.get('for_profit') if r.get('for_profit') in ('yes','sponsor','no') else next((k for k,v in fp.items() if r['name'] in v),'unknown')
names=[r['name'] for r in out]; assert len(names)==len(set(names)),[n for n in names if names.count(n)>1]
for r in out: r.pop('_or',None)
json.dump(out,open(R+'data.json','w'),separators=(',',':'),ensure_ascii=False)
from collections import Counter
print(len(out),Counter(r['cycle'] for r in out),'docs:',sum(1 for r in out if r['funding_docs']))
