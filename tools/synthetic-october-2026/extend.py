"""Append one declared synthetic month to a pinned SQLite fixture. Offline only.

Never overwrite an output or modify the parent. No network, credentials or AI.
Run: python extend.py --source retained/fixture.sqlite --out new-directory
"""
from pathlib import Path
import argparse, sqlite3, json, hashlib, math, collections
from datetime import date
from reporting import forest

ROOT=Path(__file__).resolve().parent
POLICY=json.loads((ROOT/'policy.json').read_text())
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'))
def number(*v):return int(hashlib.sha256('|'.join(map(str,v)).encode()).hexdigest()[:16],16)
def filehash(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def rows(db,sql,args=()):return [dict(r) for r in db.execute(sql,args)]
def fact_hash(db):
    # Interval endpoints may close in October; historical dimensions/pay may not change.
    q='''SELECT s.snapshot_date,s.employee_id,s.assignment_id,a.position_id,a.valid_from,
    a.bu,a.country,a.level,a.job,a.fte_basis_points,c.* FROM snapshots s
    JOIN assignments a USING(assignment_id) JOIN compensation c USING(assignment_id)
    WHERE s.snapshot_date<='2026-09-30' ORDER BY s.snapshot_date,s.employee_id'''
    h=hashlib.sha256()
    for r in db.execute(q):h.update((canonical(list(r))+'\n').encode())
    return h.hexdigest()

def build(source,out):
    source=source.resolve();out=out.resolve()
    assert filehash(source)==POLICY['parentFixtureSha256'],'Parent fixture mismatch'
    assert not out.exists(),'Refuse overwrite'
    old=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True);old.row_factory=sqlite3.Row
    assert old.execute('select cutoff from dataset').fetchone()[0]==POLICY['parentCutoff']
    out.mkdir(parents=True)
    db=sqlite3.connect(out/'fixture.sqlite');old.backup(db);db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    cfg=json.loads(source.with_name('config.json').read_text())
    seed=cfg['seed'];before=fact_hash(old);lineage=[]
    counters={}
    for table,key,prefix in [('employees','employee_id','DEMO2-E'),('assignments','assignment_id','A'),('positions','position_id','P'),('requisitions','requisition_id','R'),('applications','application_id','APP'),('hires','hire_id','H'),('movements','movement_id','M')]:
        counters[table]=max(int(r[0][len(prefix):]) for r in db.execute('select '+key+' from '+table))
    def ident(table,prefix):
        counters[table]+=1;return prefix+str(counters[table]).zfill(7)
    def insert(table,r):
        db.execute('INSERT INTO '+table+' ('+','.join(r)+') VALUES ('+','.join('?' for _ in r)+')',tuple(r.values()))
    def active(day):return rows(db,'SELECT * FROM assignments WHERE valid_from<=? AND (valid_to IS NULL OR valid_to>?) ORDER BY employee_id',(day,day))
    incumbents=active(POLICY['parentCutoff']);assert len(incumbents)==9037
    employees={r['employee_id']:r for r in rows(db,'SELECT * FROM employees')}
    def exit_rank(a):
        tenure=(date(2026,10,1)-date.fromisoformat(employees[a['employee_id']]['hire_date'])).days/365.2425
        tw=1.5 if tenure<1 else 1.2 if tenure<3 else .85 if tenure<5 else .65
        # Explicit fictional compositional clusters, not observed country/grade effects.
        cw=2.2 if a['bu']=='BU-DIGITAL' and a['country']=='US' else 1.8 if a['bu']=='BU-CONS' and a['country']=='GB' else 1.5 if a['bu']=='BU-SALES' and a['country']=='IN' else 1
        lw=1.7 if a['bu']=='BU-DIGITAL' and a['level']>=5 else 1.4 if a['bu']=='BU-MGSVC' and a['level']<=3 else 1
        u=(number(POLICY['version'],'exit',a['employee_id'])+1)/(2**64+1)
        return -math.log(u)/(tw*cw*lw),a['employee_id']
    def new_position(a,day,status):
        pid=ident('positions','P');insert('positions',dict(position_id=pid,**{k:a[k] for k in ['bu','country','level','job']},opened_on=day,closed_on=None,status=status));return pid
    def pay(a):
        midpoint=(42000+a['level']*9000+cfg['jobs'].index(a['job'])*400)*100
        full=midpoint*(8500+number(seed,'pay-ratio',a['employee_id'])%3001)//10000
        contracted=full*a['fte_basis_points']//10000;bonus=contracted//10;equity=contracted//20;total=contracted+bonus+equity
        return dict(assignment_id=a['assignment_id'],currency='USD',base_full_time_cents=full,base_contracted_cents=contracted,bonus_cents=bonus,equity_cents=equity,total_cents=total,labor_cost_cents=total*125//100,midpoint_full_time_cents=midpoint)
    def close(a,day):
        db.execute('UPDATE assignments SET valid_to=? WHERE assignment_id=?',(day,a['assignment_id']))
        db.execute("UPDATE positions SET status='closed',closed_on=? WHERE position_id=?",(day,a['position_id']))
    def recruit(a,day,rid=None,mid=None,opened='2026-10-01'):
        if rid:db.execute("UPDATE requisitions SET status='filled',planned_start=? WHERE requisition_id=?",(day,rid))
        else:
            rid=ident('requisitions','R');insert('requisitions',dict(requisition_id=rid,position_id=a['position_id'],opened_on=opened,planned_start=day,status='filled'))
        app=ident('applications','APP');n=int(day[-2:])
        # All newly recorded funnel events are October; no retrospective September edits.
        insert('applications',dict(application_id=app,requisition_id=rid,candidate_id='C'+app[3:],applied_on='2026-10-02',interviewed_on='2026-10-06',offered_on='2026-10-09',accepted_on='2026-10-'+str(min(12,n-1)).zfill(2)))
        insert('hires',dict(hire_id=ident('hires','H'),employee_id=a['employee_id'],application_id=app,start_date=day,external_internal='internal' if mid else 'external',movement_id=mid))
    exited=set();changed=set()
    for bu,p in POLICY['businessUnits'].items():
        chosen=sorted([a for a in incumbents if a['bu']==bu],key=exit_rank)[:p['exits']]
        for i,a in enumerate(chosen):
            d=8+i%3 if bu=='BU-DIGITAL' else 14+i%4 if bu=='BU-CONS' else 1+number(POLICY['version'],'exit-day',a['employee_id'])%28
            day=f'2026-10-{d:02}';close(a,day);exited.add(a['employee_id'])
            db.execute('UPDATE employees SET termination_date=? WHERE employee_id=?',(day,a['employee_id']))
            insert('separations',dict(employee_id=a['employee_id'],effective_date=day,type='voluntary' if i<p['voluntary'] else 'involuntary'))
            if i<p['backfills']:
                pid=new_position(a,day,'vacant');rid=ident('requisitions','R')
                insert('requisitions',dict(requisition_id=rid,position_id=pid,opened_on=day,planned_start=None,status='open'))
                lineage.append(dict(kind='replacement-vacancy',oldPosition=a['position_id'],newPosition=pid,date=day))
    def move(a,to,promote,index):
        day=f'2026-10-{20+index%5:02}';close(a,day)
        nxt={**a,'assignment_id':ident('assignments','A'),'valid_from':day,'valid_to':None,'bu':to,'level':a['level']+int(promote)}
        nxt['position_id']=new_position(nxt,'2026-10-01','filled');insert('assignments',nxt);money=pay(nxt);insert('compensation',money)
        mid=ident('movements','M');insert('movements',dict(movement_id=mid,employee_id=a['employee_id'],effective_date=day,type='promotion' if promote else 'transfer',from_assignment=a['assignment_id'],to_assignment=nxt['assignment_id']))
        prior=db.execute('SELECT base_contracted_cents FROM compensation WHERE assignment_id=?',(a['assignment_id'],)).fetchone()[0]
        insert('pay_adjustments',dict(movement_id=mid,old_assignment=a['assignment_id'],new_assignment=nxt['assignment_id'],effective_date=day,delta_cents=money['base_contracted_cents']-prior))
        recruit(nxt,day,mid=mid);changed.add(a['employee_id']);lineage.append(dict(kind='promotion' if promote else 'transfer',oldPosition=a['position_id'],newPosition=nxt['position_id'],date=day))
    for t in POLICY['transfers']:
        selected=sorted([a for a in incumbents if a['bu']==t['from'] and a['employee_id'] not in exited|changed],key=lambda a:number(POLICY['version'],'transfer',a['employee_id']))[:t['count']]
        for i,a in enumerate(selected):move(a,t['to'],False,i)
    for bu,p in POLICY['businessUnits'].items():
        selected=sorted([a for a in incumbents if a['bu']==bu and a['level']<12 and a['employee_id'] not in exited|changed],key=lambda a:number(POLICY['version'],'promotion',a['employee_id']))[:p['promotions']]
        for i,a in enumerate(selected):move(a,bu,True,i)
    for bu,p in POLICY['businessUnits'].items():
        vacant=rows(old,"SELECT p.*,r.requisition_id FROM positions p JOIN requisitions r USING(position_id) WHERE p.status='vacant' AND p.bu=? ORDER BY p.position_id",(bu,))
        vacant.sort(key=lambda a:number(POLICY['version'],'fill-vacancy',a['position_id']))
        assert len(vacant)>=p['fillPriorVacancies']
        templates=[a for a in incumbents if a['bu']==bu]
        for i in range(p['starts']):
            day=f'2026-10-{22+i%10:02}';eid=ident('employees','DEMO2-E')
            insert('employees',dict(employee_id=eid,hire_date=day,termination_date=None))
            prior=vacant[i] if i<p['fillPriorVacancies'] else None
            template=prior or templates[number(POLICY['version'],'new-slot',eid)%len(templates)]
            a=dict(assignment_id=ident('assignments','A'),employee_id=eid,position_id='',valid_from=day,valid_to=None,**{k:template[k] for k in ['bu','country','level','job']},fte_basis_points=8000 if number(seed,'fte',eid)%10==0 else 10000)
            if prior:
                a['position_id']=prior['position_id'];db.execute("UPDATE positions SET status='filled' WHERE position_id=?",(a['position_id'],))
            else:a['position_id']=new_position(a,'2026-10-01','filled')
            insert('assignments',a);insert('compensation',pay(a));recruit(a,day,rid=prior['requisition_id'] if prior else None)
            draw=number(seed,'realism-arrangement',eid)%100
            insert('work_arrangements',dict(employee_id=eid,arrangement='hybrid' if draw<60 else 'remote' if draw<85 else 'onsite'))
            lineage.append(dict(kind='fill-prior-vacancy' if prior else 'expansion-hire',newPosition=a['position_id'],employee=eid,date=day))
    current=active(POLICY['cutoff']);assert len(current)==9092
    for a in current:insert('snapshots',dict(snapshot_date=POLICY['cutoff'],employee_id=a['employee_id'],assignment_id=a['assignment_id']))
    # Preserve the previous forest; repair only on October membership/grade events.
    prior={r['employee_id']:r['manager_employee_id'] for r in rows(db,'SELECT * FROM reporting_intervals WHERE valid_to IS NULL')}
    events=sorted({r['valid_from'] for r in rows(db,"SELECT valid_from FROM assignments WHERE valid_from>'2026-09-30'")} | {r['valid_to'] for r in rows(db,"SELECT valid_to FROM assignments WHERE valid_to>'2026-09-30'")})
    for day in events:
        members={a['employee_id']:a for a in active(day)};parents=forest(members,prior)
        for eid in sorted(set(prior)|set(parents)):
            if eid in prior and eid in parents and prior[eid]==parents[eid]:continue
            if eid in prior:db.execute('UPDATE reporting_intervals SET valid_to=? WHERE employee_id=? AND valid_to IS NULL',(day,eid))
            if eid in parents:insert('reporting_intervals',dict(employee_id=eid,valid_from=day,valid_to=None,manager_employee_id=parents[eid],reason='october-entry' if eid not in prior else 'october-membership-repair'))
        prior=parents
    month=dict(snapshot_date=POLICY['cutoff'],external_starts=171,exits=116,voluntary_exits=77,movements=30,promotions=15)
    assert sum(p['voluntary'] for p in POLICY['businessUnits'].values())==month['voluntary_exits']
    insert('monthly_targets',month)
    cfg.update(dataset_version=POLICY['version'],cutoff=POLICY['cutoff'],target_headcount=9092,vacancies=162,october_policy=POLICY)
    cfg['monthly'].append(month)
    db.execute('UPDATE dataset SET version=?,cutoff=?,config_sha256=?',(cfg['dataset_version'],cfg['cutoff'],hashlib.sha256(canonical(cfg).encode()).hexdigest()))
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    assert fact_hash(db)==before,'Historical workforce facts changed'
    assert db.execute("SELECT count(*) FROM positions WHERE status='vacant'").fetchone()[0]==162
    for table in ['performance_reviews','employee_skills','survey_waves','survey_eligibility','survey_responses','compensation_bands','job_skill_requirements','work_arrangements']:
        oldrows=[tuple(r) for r in old.execute('SELECT * FROM '+table+' ORDER BY 1,2')]
        newrows=set(tuple(r) for r in db.execute('SELECT * FROM '+table))
        assert all(r in newrows for r in oldrows),table+' history changed'
    summary=[]
    for bu,p in POLICY['businessUnits'].items():
        before_n=sum(a['bu']==bu for a in incumbents);after_n=sum(a['bu']==bu for a in current)
        net=sum(t['count']*((t['to']==bu)-(t['from']==bu)) for t in POLICY['transfers'])
        assert after_n==before_n+p['starts']-p['exits']+net
        summary.append(dict(businessUnit=bu,opening=before_n,closing=after_n,externalStarts=p['starts'],exits=p['exits'],netTransfers=net,netChange=after_n-before_n))
    db.commit();db.close();old.close()
    assert filehash(source)==POLICY['parentFixtureSha256']
    (out/'config.json').write_text(json.dumps(cfg,indent=2)+'\n')
    (out/'october-position-lineage.json').write_text(json.dumps(lineage,indent=2)+'\n')
    report=dict(status='isolated-unpublished-candidate',parentSha256=POLICY['parentFixtureSha256'],candidateSha256=filehash(out/'fixture.sqlite'),historicalFactsSha256=before,headcount=9092,vacancies=162,monthly=month,businessUnits=summary,sourceInputsUnchanged=True)
    (out/'october-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();build(args.source,args.out)
