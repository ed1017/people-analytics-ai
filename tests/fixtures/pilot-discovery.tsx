/** Actual Action Planning page; browser test intercepts every transport. */
import {createRoot} from 'react-dom/client';
import Page from '../../app/page';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {decisionStore} from '../../components/decision-store';
Object.assign(window,{pilotDiscovery:{snapshot:()=>decisionStore.getSnapshot()}});
createRoot(document.getElementById('root')!).render(<DatasetBoundary initialToken="legacy-v1:0"><Page/></DatasetBoundary>);
