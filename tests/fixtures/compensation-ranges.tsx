import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {GlobalWorkforceFilters} from '../../components/global-workforce-filters';
import {CompensationPage} from '../../components/pages/compensation-page';
function Fixture() {
  const [country,setCountry]=useState('all'), [org,setOrg]=useState('all'), [level,setLevel]=useState('all');
  return <><GlobalWorkforceFilters options={{countries:[{value:'US',label:'United States'}],business_units:[{value:'BU1',label:'Unit 1'}],levels:[{value:'L1',label:'Level 1'},{value:'L2',label:'Level 2'}]}} country={country} org={org} level={level} onCountry={setCountry} onOrg={setOrg} onLevel={setLevel} onReset={()=>{setCountry('all');setOrg('all');setLevel('all');}} loading={false}/><CompensationPage scope={{country,org,level}}/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
