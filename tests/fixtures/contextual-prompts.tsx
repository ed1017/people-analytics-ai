import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {OverallOverviewPage} from '@/components/pages/overall-overview-page';
import {useProblemConversation} from '@/components/problem-conversation';
import {emptyDevelopmentSession} from '@/components/development-workspace';
import {AiPanel} from '@/components/ai-panel';
import {contextualPrompts} from '@/lib/contextual-prompts';
const noop=()=>{};
function Fixture(){
 const conversation=useProblemConversation();
 const [panel,setPanel]=useState(false),[draft,setDraft]=useState(''),[ready,setReady]=useState(true);
 return <main className="mx-auto max-w-4xl p-4"><div className="flex flex-wrap gap-2">{['retention','skills'].map(id=><button key={id} onClick={()=>conversation.selectGoal(id)}>{id} goal</button>)}<button onClick={()=>conversation.setMessages([{role:'user',content:'Synthetic previous question'}])}>Previous discussion</button><button onClick={()=>setPanel(value=>!value)}>Toggle panel</button><button onClick={()=>setReady(value=>!value)}>Toggle panel evidence</button></div>
 {panel?<AiPanel aiCollapsed={false} aiExpanded={true} aiWidth={400} previewPage={false} suggestedPrompts={contextualPrompts({page:'skills',goal:conversation.focusedIssue,hasConversation:conversation.messages.length>0,evidenceReady:ready})} scopeNote="Synthetic fixture" chatMessages={[]} chatInput={draft} chatLoading={false} chatError={null} dashboardReady={ready} onResizeStart={noop} onResizeKeyDown={noop} onToggleExpanded={noop} onToggleCollapsed={noop} onChatInputChange={setDraft} onSend={()=>{void fetch('/api/chat',{method:'POST',body:JSON.stringify({message:draft})})}}/>:<OverallOverviewPage onStartDemo={noop} active persona="HR" onNavigate={noop} workforceQuery="?country=all" workforceScope="Synthetic all countries" conversation={conversation} developmentSession={emptyDevelopmentSession()} countryOptions={[]} onCountry={noop} onEvidencePack={noop} marketReference={null}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
