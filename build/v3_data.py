# Builds the data blocks for the v3 features: applicant track record, change log,
# document library, regional room rates and the long-form guides.
# Called from build2.py with `data`, `R`, `S` in scope; sets V3 (dict of JSON strings) and GUIDES (html).
import json, os, re, subprocess

def _j(o): return json.dumps(o, separators=(',', ':'), ensure_ascii=False).replace('</script', '<\\/script')

# ---------- applicant track record ----------
# row: [recipient, jurisdiction, state, year, type, activity, requested, awarded, nights_pred, nights, att_pred, att, method, source]
TYPES = {'Event/Festival': 'E', 'Marketing': 'M', 'Facility': 'F'}
rows = []
jl = R + 'jlarc/normalized.json'
if os.path.exists(jl):
    for x in json.load(open(jl)):
        if not x.get('recipient') or x.get('recipient_is_jurisdiction'): continue
        rows.append([x['recipient'].strip(), x.get('jurisdiction'), 'WA', x.get('year'), TYPES.get(x.get('activity_type'), 'O'),
                     (x.get('activity_name') or '').strip() or None, x.get('funds_requested'), x.get('amount_awarded'),
                     x.get('paid_lodging_nights_predicted'), x.get('paid_lodging_nights'),
                     x.get('total_attendance_predicted'), x.get('total_attendance'), x.get('attendance_method'), 'J'])
seen_local = set()
for r in data:
    la = r.get('local_awards') or {}
    for y, v in (la.get('years') or {}).items():
        for a in v.get('awards') or []:
            if not a.get('recipient') or a.get('dmo'): continue
            if re.search(r'^\d+\s|applicants|various|multiple|^total|subtotal|unspecified|not published|\bTBD\b', a['recipient'], re.I): continue
            k = (a['recipient'].lower(), r['name'], str(y))
            if k in seen_local: continue
            seen_local.add(k)
            rows.append([a['recipient'].strip(), r['name'], r.get('state', 'WA'), int(re.sub(r'\D', '', str(y))[:4] or 0) or None, 'E' if a.get('event') else 'O',
                         a.get('event'), None, a.get('amount'), None, None, None, None, None, 'L'])
TRACK = rows

# ---------- change log from git history of data.json ----------
FIELDS = [('deadline', 'Deadline'), ('has_ltac_grants', 'Open program'), ('competitive_pool_usd', 'Open to applicants'),
          ('total_pool_usd', 'Total fund'), ('cycle', 'Cycle'), ('pres', 'Presentation date'), ('for_profit', 'For-profit eligibility'),
          ('nmembers', 'Committee roster'), ('url', 'Program page')]
def _snap(rec):
    p = rec.get('presentation') or {}
    return {'deadline': rec.get('deadline'), 'has_ltac_grants': rec.get('has_ltac_grants'), 'competitive_pool_usd': rec.get('competitive_pool_usd'),
            'total_pool_usd': rec.get('total_pool_usd'), 'cycle': rec.get('cycle'), 'pres': p.get('date'), 'for_profit': rec.get('for_profit'),
            'nmembers': len(rec.get('members') or []), 'url': rec.get('url')}
CHANGES = {}
try:
    log = subprocess.run(['git', '-C', R, 'log', '--reverse', '--format=%H %ad', '--date=short', '--', 'data.json'], capture_output=True, text=True).stdout.split('\n')
    prev = None
    commits = [l.split() for l in log if l.strip()]
    snaps = []
    for h, d in commits:
        raw = subprocess.run(['git', '-C', R, 'show', f'{h}:data.json'], capture_output=True, text=True).stdout
        try: recs = json.loads(raw)
        except Exception: continue
        snaps.append((d, {x['name']: _snap(x) for x in recs if x.get('name')}))
    snaps.append((None, {x['name']: _snap(x) for x in data}))  # working tree (current build)
    for i in range(1, len(snaps)):
        d = snaps[i][0] or snaps[i - 1][0]
        a, b = snaps[i - 1][1], snaps[i][1]
        for name, s in b.items():
            o = a.get(name)
            if o is None: continue
            for f, label in FIELDS:
                if o.get(f) != s.get(f):
                    if f == 'url' and (o.get(f) or '').rstrip('/') == (s.get(f) or '').rstrip('/'): continue
                    CHANGES.setdefault(name, []).append([d, label, o.get(f), s.get(f)])
    for k in CHANGES:
        # keep the latest change per field, newest first, max 6
        last = {}
        for c in CHANGES[k]: last[c[1]] = c
        CHANGES[k] = sorted(last.values(), key=lambda c: c[0], reverse=True)[:6]
except Exception as ex:
    print('changes failed', ex)

# ---------- library, room rates ----------
LIB = json.load(open(R + 'library/library.json')) if os.path.exists(R + 'library/library.json') else []
ADR = json.load(open(R + 'library/adr.json')) if os.path.exists(R + 'library/adr.json') else {}

# ---------- tax rate default per jurisdiction (first percentage in tax_rate text) ----------
for r in data:
    m = re.search(r'(\d+(?:\.\d+)?)\s*%', r.get('tax_rate') or '')
    r['rate_pct'] = float(m.group(1)) if m and float(m.group(1)) <= 15 else None

GUIDES = ''
for fn, st in (('counting_guide.html', None), ('hb4148_brief.html', 'OR')):
    p = R + 'library/' + fn
    if os.path.exists(p):
        t = open(p).read()
        GUIDES += (f'<div data-state="{st}">' + t + '</div>') if st else t

V3 = {'track': _j(TRACK), 'changes': _j(CHANGES), 'library': _j(LIB), 'adr': _j(ADR)}
print('v3: track rows', len(TRACK), 'changed records', len(CHANGES), 'library', len(LIB))
