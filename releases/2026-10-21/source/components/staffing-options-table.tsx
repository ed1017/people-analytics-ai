import type {ReactNode} from 'react';
import type {ServiceStaffingOption} from '@/lib/home-service-staffing';
type Row=Pick<ServiceStaffingOption,'id'|'mix'|'cash'|'staffHours'|'coverageDate'|'shortfallHours'|'status'|'reason'>;
const number=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
/** Same visible option metrics in the guide and ordinary right-hand workspace. */
export function StaffingOptionsTable({options,enumerated,action}:{options:Row[];enumerated:number;action:(option:Row)=>ReactNode}){
 return <div className="overflow-x-auto"><table className="w-full text-left"><caption>{enumerated} combinations evaluated within the supplied bounds</caption><thead><tr>{['Develop / move / hire','Complete cash (USD)','Training hours','Coverage date','Workload shortfall (hours)','Entered limits','Review'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{options.map(option=><tr className="border-t" key={option.id} data-staffing-option={option.id}><td className="p-2">{option.mix.build} / {option.mix.move} / {option.mix.buy}</td><td>{number(option.cash)}</td><td>{number(option.staffHours)}</td><td>{option.coverageDate??'Unknown'}</td><td>{number(option.shortfallHours)}</td><td>{option.status}{option.reason&&<p>{option.reason}</p>}</td><td>{action(option)}</td></tr>)}</tbody></table></div>;
}
