import React from 'react';
import {createRoot} from 'react-dom/client';
import {SwpHeadcountComparison} from '../../components/swp-headcount-comparison';
import type {SwpHistory} from '../../lib/swp-history-qualification';
import development from '../../experiments/swp-headcount/development-history.json';
import holdout from '../../experiments/swp-headcount/holdout.json';
const history = {...development,points:[...development.points,...holdout.points]} as SwpHistory;
if (new URLSearchParams(location.search).has('invalid')) history.scope.dimension = 'business-unit';
createRoot(document.getElementById('root')!).render(<main style={{padding:12,fontFamily:'Arial, sans-serif'}}><SwpHeadcountComparison history={history}/></main>);
