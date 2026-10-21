/** Existing company GET surface shared by presenters and local request guard. */
export const LOCAL_COMPANY_GET_ROUTES = Object.freeze([
  '/api/workforce','/api/attrition','/api/talent-acquisition','/api/overview','/api/headcount','/api/headcount-trend',
  '/api/dashboard','/api/compensation','/api/compensation-ranges','/api/compensation-job-release',
  '/api/skills','/api/career-growth-mobility','/api/career-mobility','/api/survey-sentiment','/api/workforce-planning','/api/finance',
  '/api/learning-development','/api/position-modeling','/api/succession-coverage',
]);

/** Read-only or pure arithmetic operations; never model transports or database writes. */
export const LOCAL_9037_METHODS=Object.freeze(Object.fromEntries([
 ...LOCAL_COMPANY_GET_ROUTES.map(path=>[path,Object.freeze(['GET'])]),
 ...['position-actions','position-structure','scenario-modeler','business-unit-scenario'].map(name=>['/api/'+name,Object.freeze(['GET','POST'])]),
 ...['internal-talent-readiness','role-buy-feasibility','occupational-reference'].map(name=>['/api/'+name,Object.freeze(['GET'])]),
 ...['role-workforce-response-plan','workforce-response-plan','workforce-response-portfolio','business-unit-response-allocation','time-phased-workforce-execution','workforce-response-constraints','constraint-aware-workforce-scheduler','workforce-solution'].map(name=>['/api/'+name,Object.freeze(['POST'])]),
]));
export const local9037OperationAllowed=(method,path)=>Object.hasOwn(LOCAL_9037_METHODS,path)&&LOCAL_9037_METHODS[path].includes(method);
