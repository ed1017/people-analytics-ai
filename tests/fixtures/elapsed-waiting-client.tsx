/** Real client app; expose unmount solely to verify timer teardown. */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Page from '../../app/page';
import {DatasetBoundary} from '../../components/dataset-boundary';
import {usePendingRequest} from '../../components/use-pending-request';
import {ElapsedWaitingTime} from '../../components/elapsed-waiting-time';
function PendingProbe(){
 const {pending,setPending,startedAt}=usePendingRequest();
 return <><button onClick={()=>setPending(true)}>Start probe</button><button onClick={()=>{setPending(false);setPending(true);}}>Restart probe</button><button onClick={()=>setPending(value=>!value)}>Toggle probe</button>{pending&&startedAt!==null&&<ElapsedWaitingTime key={startedAt} startedAt={startedAt}/>}</>;
}
let root=createRoot(document.getElementById('root')!);
Object.assign(window,{
 unmountWaitingFixture:()=>root.unmount(),
 mountPendingProbe:()=>{root=createRoot(document.getElementById('root')!);root.render(<StrictMode><PendingProbe/></StrictMode>);},
});
root.render(<DatasetBoundary initialToken="legacy-v1:0"><Page/></DatasetBoundary>);
