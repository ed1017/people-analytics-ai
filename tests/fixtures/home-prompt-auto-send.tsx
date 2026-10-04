import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {OverallOverviewPage} from '@/components/pages/overall-overview-page';
import {useProblemConversation} from '@/components/problem-conversation';
import {emptyDevelopmentSession} from '@/components/development-workspace';
const noop=()=>{},development=emptyDevelopmentSession();
function Fixture(){
 const conversation=useProblemConversation(),[active,setActive]=useState(true);
 const prior=()=>document.querySelector<HTMLButtonElement>('[aria-label="Suggested questions"] button');
 return <main><button onClick={()=>setActive(value=>!value)}>Back or return</button><button onClick={()=>conversation.selectGoal('a')}>Goal A</button><button onClick={()=>conversation.selectGoal('b')}>Goal B</button><button onClick={()=>{prior()?.click();setActive(false)}}>Click then navigate</button><button onClick={()=>{prior()?.click();conversation.selectGoal('b')}}>Click then goal switch</button><button onClick={()=>{conversation.setInput('Keep queued draft');prior()?.click()}}>Queue draft then click</button>
 <div hidden={!active}><OverallOverviewPage active={active} onNavigate={()=>setActive(false)} onStartDemo={noop} persona="HR" workforceQuery="?country=all" workforceScope="Synthetic all countries" conversation={conversation} developmentSession={development} countryOptions={[]} onCountry={noop} onEvidencePack={noop} marketReference={null}/></div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
