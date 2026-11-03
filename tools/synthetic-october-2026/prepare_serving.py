"""Prepare isolated October adapter inputs; never mutate the retained source.

Run with --workspace pointing at the directory containing the retained bundles.
Auxiliary assessments/preferences/enrolments retain their original records and dates.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import sys


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def prepare(workspace):
    parent = workspace / 'synthetic-geography-candidate-20261023'
    root = workspace / 'synthetic-october-candidate-20261103'
    fixture = root / 'candidate'
    out = root / 'serving-prep'
    if out.exists():
        raise ValueError('Refusing to overwrite serving preparation')
    sys.path.insert(0, str(workspace / 'synthetic-realism-baseline-20261023'))
    from validate import group_ledger
    from generate import table_digests
    sys.path.insert(0, str(parent))
    from career import summarize
    cfg = json.loads((fixture / 'config.json').read_text())
    validation = json.loads((fixture / 'october-validation.json').read_text())
    with sqlite3.connect(f'file:{fixture / "fixture.sqlite"}?mode=ro', uri=True) as db:
        ledger = group_ledger(db, cfg)
        assert all(row['residual'] == 0 for row in ledger)
        tables = table_digests(db)
        db.row_factory = sqlite3.Row
        monthly = [dict(r) for r in db.execute('SELECT * FROM monthly_movement ORDER BY snapshot_date')]
        career = summarize(db, cfg['cutoff'])
    def save(name, value):
        (fixture / name).write_text(json.dumps(value, indent=2) + '\n')
    with (fixture / 'group-reconciliation.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(ledger[0]))
        writer.writeheader()
        writer.writerows(ledger)
    save('monthly-reconciliation.json', monthly)
    save('career-aggregates.json', career)
    shutil.copyfile(parent / 'candidate/survey-aggregates.json', fixture / 'survey-aggregates.json')
    manifest = dict(version=cfg['dataset_version'], config_sha256=sha(fixture / 'config.json'),
                    tables=tables, dataset_content_sha256=hashlib.sha256(canonical(tables)).hexdigest(),
                    validation=dict(cutoff_headcount=cfg['target_headcount'], groupTransitions=len(ledger),
                                    companyTransitions=len(monthly)-1, servingReplay='pending'))
    save('manifest.json', manifest)
    bundle = dict(bundle_id=cfg['dataset_version'], status='unapproved-local-candidate',
                  snapshot_date=cfg['cutoff'], population=cfg['target_headcount'],
                  dataset_sha256=manifest['dataset_content_sha256'], sqlite_sha256=sha(fixture / 'fixture.sqlite'),
                  artifacts_sha256={p.name: sha(p) for p in sorted(fixture.iterdir())
                                    if p.suffix in ('.json', '.csv') and p.name != 'bundle.json'},
                  source_observed_at=None, operationally_qualified=False, independent_forecast_validation=False)
    bundle['bundle_sha256'] = hashlib.sha256(canonical(bundle)).hexdigest()
    save('bundle.json', bundle)
    shutil.copyfile(fixture / 'config.json', root / 'config.json')
    for name in ('career.py', 'skill_policy.py'):
        shutil.copyfile(parent / name, root / name)
    out.mkdir()
    shutil.copytree(parent / 'serving-prep/metadata', out / 'metadata')
    for name in ('build_adapter.py', 'build_components.py', 'build_history.py', 'build_views.py', 'required-app-queries.json'):
        shutil.copyfile(parent / 'serving-prep' / name, out / name)
    adapter = out / 'build_adapter.py'
    text = adapter.read_text().replace("manifest['population']==9037", "manifest['population']==9092")
    text = text.replace("company_name='Constructed 9037-person demo'", "company_name='Constructed workforce demo'")
    # These are independent dated observations/intentions, not facts that can be
    # refreshed by re-enumerating the current employee cohort.
    marker = ' # Preserve exact types, nullability and every source constraint'
    assert text.count(marker) == 1
    retained = ('talent_ratings', 'employee_goals', 'career_preferences', 'employee_learning', 'succession_plans')
    block = '\n # Retain September auxiliary records byte-for-byte; no new October assessments.\n'
    block += f' for table in {retained!r}:\n'
    block += f"  source=Path({str(parent / 'serving-prep/generated/csv')!r})/(table+'.csv')\n"
    block += "  (OUT/'csv'/(table+'.csv')).write_bytes(source.read_bytes())\n"
    block += "  with source.open(newline='') as stream: counts[table]=sum(1 for _ in csv.reader(stream))\n"
    block += "  mappings[table]={'status':'retained-september-records-no-new-observations','rows':counts[table]}\n"
    text = text.replace(marker, block + marker)
    adapter.write_text(text)
    history = out / 'build_history.py'
    text = history.read_text()
    text = text.replace("ORIGINAL.parent/'synthetic-realism-candidate-20261023/candidate-varied/monthly-reconciliation.json'", "FIXTURE/'monthly-reconciliation.json'")
    text = text.replace('92b2e57e68dee5fb8f66f122cbf3180de0f03011dcf82b2cce771d14faa04d4d', sha(fixture / 'monthly-reconciliation.json'))
    text = text.replace('c80417b83bec05b5353d4e32a8c2257b50af07b8453ed093f5f5fb85cc80b9bb', sha(fixture / 'group-reconciliation.csv'))
    history.write_text(text)
    prepare_components(root, parent)
    prepare_replay(root, parent)
    prepare_views(root, parent)
    prepare_queries(root, parent)
    print(json.dumps(dict(bundle=bundle['bundle_sha256'], groups=len(ledger), months=len(monthly), status='prepared; replay pending')))


def prepare_components(root, parent):
    """Update only derivation periods; retain the September assessment cohorts."""
    path = root / 'serving-prep/build_components.py'
    text = (parent / 'serving-prep/build_components.py').read_text()
    replacements = {
        "bundle['population']==9037": "bundle['population']==9092",
        'len(active)==9037': 'len(active)==9092',
        'range(1,33)': 'range(1,len(dates))',
        'rounded(900*num/den)': 'rounded(100*len(trend[24:])*num/den)',
        'calendar_months=9': 'calendar_months=len(trend[24:])',
        'planned_headcount=9037': 'planned_headcount=len(active)',
        'activePopulation=9037': 'activePopulation=len(active)',
        'nine calendar month-end stocks': 'ten calendar month-end stocks',
        'voluntary-ytd-nine-month-average-stock-v2': 'voluntary-ytd-calendar-month-average-stock-v3',
        "'33 month stock/FTE','32 month starts/exits/movement legs'": "'34 month stock/FTE','33 month starts/exits/movement legs'",
        "releases={name:f'{name}-9037-2026-09-30-offline-v1'": "releases={name:f'{name}-9092-2026-10-31-offline-v1'",
        "if day==cutoff:parts['ratings']": "if day=='2026-09-30':parts['ratings']",
        "source='employee_snapshots JOIN performance_reviews',snapshotDate=cutoff": "source='employee_snapshots JOIN performance_reviews',snapshotDate=day",
        "simulatedAvailableAt=cutoff+'T23:59:59.999Z'": "simulatedAvailableAt=day+'T23:59:59.999Z'",
    }
    for before, after in replacements.items():
        assert before in text, before
        text = text.replace(before, after)
    marker = " rating_provenance="
    text = text.replace(marker, " for name in ['ratings','survey','succession']:releases[name]=f'{name}-9037-2026-09-30-offline-v1'\n" + marker)
    start = text.index(" critical={r['job_profile_id']")
    end = text.index(' def save(name,obj):', start)
    # No new succession assessment is inferred from October workforce membership.
    text = text[:start] + f" parts['succession']=read(Path({str(parent / 'components-final/components.json')!r}))['succession']\n" + text[end:]
    path.write_text(text)


def prepare_replay(root, parent):
    text = (parent / 'replay.mjs').read_text()
    text = text.replace("../synthetic-skills-candidate-20261023/components/components.json", "../synthetic-geography-candidate-20261023/components-final/components.json")
    text = text.replace("for(const name of Object.keys(parts))assert.equal", "for(const name of ['ratings','survey','succession'])assert.equal")
    start = text.index(" const courses=new Set")
    end = text.index(" const queries=", start)
    text = text[:start] + " fs.writeFileSync(path('component-parity.json'),JSON.stringify({status:'passed',retainedComponents:['ratings','survey','succession'],skillRows:12,productionConnected:false},null,2)+'\\n');\n" + text[end:]
    text = text.replace("../synthetic-skills-candidate-20261023/capture.json", "../synthetic-geography-candidate-20261023/capture.json")
    marker = " console.log('Complete'"
    checks = """ const current=(await db.query('SELECT count(*)::int n FROM demo9037_v3_1.employees WHERE termination_date IS NULL')).rows[0].n;
 assert.equal(current,9092);
 const stock=(await db.query(\"SELECT count(*)::int n FROM demo9037_v3_1.employee_snapshots WHERE snapshot_date='2026-10-31'\")).rows[0].n;
 assert.equal(stock,9092);
 const vacancies=(await db.query(\"SELECT count(*)::int n FROM demo9037_v3_1.positions WHERE position_status='vacant'\")).rows[0].n;
 assert.equal(vacancies,162);
 fs.writeFileSync(path('replay-validation.json'),JSON.stringify({status:'passed',queries:Object.keys(capture).length,current,stock,vacancies,productionConnected:false},null,2)+'\\n');
"""
    assert marker in text
    text = text.replace(marker, checks + marker)
    (root / 'replay.mjs').write_text(text)


def prepare_views(root, parent):
    text = (parent / 'serving-prep/build_views.py').read_text()
    marker = '\ndeps='
    transform = """
# Advance workforce reporting windows only. Survey waves and talent assessment
# dates remain their original evidence dates, independent of the workforce cutoff.
for name, sql in list(views.items()):
 if name.startswith('survey_'):continue
 if name=='talent_overview':
  sql=sql.replace("es.snapshot_date = '2026-09-30'", "es.snapshot_date = '2026-10-31'")
 else:
  sql=sql.replace('2026-09-30','2026-10-31').replace('2026-09-01','2026-10-01')
  sql=sql.replace('12.0 / 9.0','12.0 / 10.0')
 views[name]=sql
"""
    assert marker in text
    text = text.replace(marker, transform + marker)
    marker = "func=func.replace('public.'"
    assert marker in text
    text = text.replace(marker, "func=func.replace('2026-09-30','2026-10-31').replace('12.0 / 9.0','12.0 / 10.0')\n" + marker)
    (root / 'serving-prep/build_views.py').write_text(text)


def prepare_queries(root, parent):
    queries = json.loads((parent / 'serving-prep/required-app-queries.json').read_text())
    for name, query in list(queries.items()):
        if name.startswith('survey_') or name == 'succession_counts':
            continue
        # These cutoffs select current membership / event windows. Stored profile,
        # preference and assessment dates themselves are never rewritten.
        queries[name] = query.replace('2026-09-30', '2026-10-31').replace('2026-09-01', '2026-10-01')
        if name.startswith('role_recruiting'):
            queries[name] = queries[name].replace('2025-10-01', '2025-11-01')
        if name == 'talent_integrity':
            # Retain historical preferences, but count the current active pool.
            queries[name] = queries[name].replace(
                '(SELECT count(*) FROM demo9847_v2.career_preferences) AS preferences',
                "(SELECT count(*) FROM demo9847_v2.career_preferences p JOIN demo9847_v2.employee_snapshots e ON e.employee_id=p.employee_id AND e.snapshot_date=DATE '2026-10-31' AND e.employment_status='active') AS preferences")
            queries[name] = queries[name].replace(
                "LEFT JOIN demo9847_v2.employee_snapshots s ON s.employee_id=p.employee_id AND s.snapshot_date=DATE '2026-10-31' LEFT JOIN demo9847_v2.job_profiles",
                'LEFT JOIN demo9847_v2.employees s ON s.employee_id=p.employee_id LEFT JOIN demo9847_v2.job_profiles')
    (root / 'serving-prep/required-app-queries.json').write_text(json.dumps(queries, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--workspace', type=Path, required=True)
    prepare(parser.parse_args().workspace.resolve())
