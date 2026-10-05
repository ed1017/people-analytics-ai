// Offline deterministic projection. No credentials, runtime endpoint or model service.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateAggregateExitDemo} from '../../lib/ml/aggregate-exit-forecast.ts';

export async function exitDemoPresentation(){
 const fixture=await readFile(new URL('../fixtures/aggregate-exit-history.json',import.meta.url));
 const evaluator=await readFile(new URL('../../lib/ml/aggregate-exit-forecast.ts',import.meta.url));
 const report=evaluateAggregateExitDemo(JSON.parse(fixture.toString('utf8')));
 if(report.status!=='conditional-retrospective-synthetic-demo'||report.productIntegrationEnabled||report.qualification.countForecastQualified||report.forecast.rate!==null||report.forecast.uncertainty.interval!==null)throw Error('Unsupported presentation qualification.');
 const year=report.forecast.origin.slice(0,4),q=report.qualification;
 return {
  schemaVersion:1,status:report.status,operationallyQualified:false,
  methodVersion:report.protocol.methodVersion,
  identities:{fixtureSha256:createHash('sha256').update(fixture).digest('hex'),evaluatorSha256:createHash('sha256').update(evaluator).digest('hex'),datasetFingerprint:report.datasetFingerprint,protocolFingerprint:report.protocolFingerprint},
  provenance:report.evidence.provenance,
  history:{start:q.historyStart,end:q.historyEnd,usableMonths:q.usableMonths,excluded:q.excluded},
  qualification:{countForecastQualified:q.countForecastQualified,rateForecastQualified:q.rateForecastQualified,pointInTimeValidated:q.pointInTimeValidated,completenessVerified:q.completenessVerified,generatorProvenanceVerified:q.generatorProvenanceVerified},
  assumptions:q.assumptions,blockers:q.blockers,
  recordedSubtotal:{start:year+'-01',end:report.forecast.origin,value:report.forecast.observedYtdExits,completenessVerified:false},
  conditional:{points:report.forecast.points,remainingTotal:report.forecast.expectedTotal,yearEndTotal:report.forecast.expectedYearEndExits},
  selectedMethod:report.selection.method,selectionRule:report.protocol.selection,
  evaluation:{developmentOrigins:report.protocol.developmentOrigins,distinctDevelopmentMonths:report.development[0].metrics.distinctTargetMonths,assessmentOrigin:report.protocol.holdoutOrigin,assessmentCustody:report.evidence.evaluation.assessmentCustody},
  methods:report.development.map(item=>({id:item.method,kind:report.evidence.methods.find(method=>method.id===item.method).kind,development:item.metrics,assessment:report.holdout.find(method=>method.method===item.method).metrics})),
  historyWindows:report.historyWindowComparisons.map(window=>({id:window.historyWindow,rows:window.development.map(method=>({method:method.method,developmentMae:method.metrics.overall.mae,assessmentMae:window.assessment.find(item=>item.method===method.method).metrics.overall.mae,remainingTotal:window.forecasts.find(item=>item.method===method.method).expectedTotal}))})),
  uncertainty:report.forecast.uncertainty,rate:report.forecast.rate,
 };
}

if(process.argv[1]&&new URL('file:'+process.argv[1]).href===import.meta.url){
 const mode=process.argv[2]??'--check';if(process.argv.length>3||!['--check','--write'].includes(mode))throw Error('Use --check or --write only.');
 const file=new URL('../../lib/data/aggregate-exit-demo-v1.json',import.meta.url),text=JSON.stringify(await exitDemoPresentation(),null,2)+'\n';
 if(mode==='--write')await writeFile(file,text);else if(await readFile(file,'utf8')!==text)throw Error('Presentation artifact differs from the reviewed offline report.');
 console.log('Exit demo presentation '+(mode==='--write'?'generated.':'verified.'));
}
