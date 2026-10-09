/** Actual client application and dataset boundary; only server transport is mocked. */
import {createRoot} from 'react-dom/client';
import Page from '../../app/page';
import {DatasetBoundary} from '../../components/dataset-boundary';

createRoot(document.getElementById('root')!).render(
  <DatasetBoundary initialToken="legacy-v1:0"><Page/></DatasetBoundary>,
);
