"""Rebuild the site: python3 build/run.py  (run from anywhere)
Order: merge.py (jurisdiction batches -> data.json), events_build.py (JLARC rows -> jlarc/events.json), build2.py (-> index.html, ltac.html, data.json with JLARC/local awards merged)."""
import subprocess,sys,os
B=os.path.dirname(os.path.abspath(__file__))
for s in ('merge.py','events_build.py','build2.py'):
    print('==',s); subprocess.run([sys.executable,'-I',os.path.join(B,s)],check=True)
