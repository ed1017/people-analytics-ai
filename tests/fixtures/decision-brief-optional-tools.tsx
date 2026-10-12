import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {DecisionBrief} from '@/components/decision-brief';
import {decisionStore} from '@/components/decision-store';
import type {ProblemConversation} from '@/components/problem-conversation';
// The browser test supplies deterministic, locally generated saved records.
decisionStore.initialize(localStorage);
function Host(){
 const [goal,setGoal]=useState('a'),[visible,setVisible]=useState(true);
 return <><button onClick={()=>setVisible(v=>!v)}>Toggle brief</button><button onClick={()=>setGoal(g=>g==='a'?'b':'a')}>Switch goal</button>{visible&&<DecisionBrief conversation={{activeGoalId:goal,focusedIssue:goal==='a'?'Reduce turnover':'Other goal'} as ProblemConversation} onNavigate={()=>{}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<Host/>);
