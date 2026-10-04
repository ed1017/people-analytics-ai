import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {OptionSwitcher} from '@/components/option-switcher';
function Fixture(){
 const [count,setCount]=useState(1),[selected,setSelected]=useState('a');
 return <main className="mx-auto max-w-3xl p-4"><div>{[1,2,3].map(n=><button key={n} onClick={()=>setCount(n)}>Show {n}</button>)}</div><div style={{height:500}}/><OptionSwitcher options={['a','b','c'].slice(0,count).map(id=>({id}))} selectedId={selected} onSelect={setSelected}>{option=><article aria-label={option.id}><p>Calculated fixture {option.id}</p><details><summary>Details</summary><input aria-label={`Draft ${option.id}`} defaultValue=""/></details></article>}</OptionSwitcher><div style={{height:800}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
