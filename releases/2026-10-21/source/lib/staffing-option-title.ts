/** Name only actions actually present in the calculated option. */
export function staffingOptionTitle(mix:{build:number;move:number;buy:number}):string {
 const actions=[mix.build>0?'development':null,mix.move>0?'internal moves':null,mix.buy>0?'hiring':null].filter(Boolean);
 if(actions.length===0)return 'No added staffing';
 if(actions.length===1)return mix.build>0?'Develop your team':mix.move>0?'Move internal candidates':'Hire the roles';
 if(mix.buy===0)return 'Develop and move your team';
 return 'Mix '+actions.join(' and ');
}
