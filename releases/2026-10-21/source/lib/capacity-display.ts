/** Presentation only: positive required-minus-available is a shortfall. */
export function capacityBalanceLabel(gap:number|null):string {
 if(gap===null||!Number.isFinite(gap))return 'Unknown';
 if(gap===0)return 'Capacity matched';
 const magnitude=Math.abs(gap),value=magnitude<0.005?'<0.01':magnitude.toLocaleString('en-US',{maximumFractionDigits:2});
 return `${gap>0?'Short':'Surplus'} ${value} FTE`;
}
/** Clip shading to positive gaps between the same straight monthly plot segments.
 * Missing values break areas; no trajectory or probability is added.
 */
export function capacityShortfallAreas(points:readonly {requiredFte:number|null;allocatedFte:number|null}[]){
 const areas:{x:number;y:number}[][]=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if([a.requiredFte,a.allocatedFte,b.requiredFte,b.allocatedFte].some(v=>v===null||!Number.isFinite(v)))continue;
  const d0=a.requiredFte!-a.allocatedFte!,d1=b.requiredFte!-b.allocatedFte!;
  if(d0<=0&&d1<=0)continue;
  const crossing=d0/(d0-d1),start=d0<0?crossing:0,end=d1<0?crossing:1;
  const at=(t:number,key:'requiredFte'|'allocatedFte')=>({x:i-1+t,y:a[key]!+(b[key]!-a[key]!)*t});
  areas.push([at(start,'requiredFte'),at(end,'requiredFte'),at(end,'allocatedFte'),at(start,'allocatedFte')]);
 }
 return areas;
}
