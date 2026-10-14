/** Offline server-layout driver, not a production dataset selector. */
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import Page from '../../app/page';
import {DatasetBoundary} from '../../components/dataset-boundary';
function Fixture(){
 const [token,setToken]=useState(()=>sessionStorage.getItem('fixture-server-token')??'legacy-v1:0');
 return <><label>Fixture server bootstrap token<select aria-label="Fixture server bootstrap token" value={token} onChange={event=>{sessionStorage.setItem('fixture-server-token',event.target.value);setToken(event.target.value);}}><option value="legacy-v1:0">Legacy fixture</option><option value="fixture-next:1">Next fixture</option><option value="legacy-v1:2">Retained release fixture</option></select></label><DatasetBoundary initialToken={token}><Page/></DatasetBoundary></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
