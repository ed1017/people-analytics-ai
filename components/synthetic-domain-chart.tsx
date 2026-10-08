'use client';
import {resolveProjectionBacktest} from '@/lib/projection-backtest';
import {useEffect, useId, useLayoutEffect, useRef, useState, type SyntheticEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {demoMethodLabels, demoDomainCopy, formatDemoValue, type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
import {chartPeriod as period, monthIndex, forecastScale, forecastDateTicks, historySegments, hasChartValue, forecastPointFeedback, forecastTooltipPosition} from '@/lib/forecast-chart-layout';

const colors = ['#2563eb', '#b45309', '#a855f7'];
const dashes = ['2 4', '5 4', '8 3 2 3'];
type PointFeedback = {date:string;value:string;series:string};
type PointTip = {anchor:Element;feedback:PointFeedback};
const feedbackText = (feedback:PointFeedback) => `${feedback.date} · ${feedback.value} · ${feedback.series}`;
function PointTooltip({tip,id}:{tip:PointTip;id:string}) {
  const card=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const place=()=>{if(!card.current)return;const view=window.visualViewport;
      const position=forecastTooltipPosition(tip.anchor.getBoundingClientRect(),card.current.getBoundingClientRect(),{left:view?.offsetLeft??0,top:view?.offsetTop??0,width:view?.width??innerWidth,height:view?.height??innerHeight});
      card.current.style.left=`${position.left}px`;card.current.style.top=`${position.top}px`;
    };
    place();window.addEventListener('scroll',place,true);window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
    return()=>{window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);};
  },[tip]);
  return createPortal(<div ref={card} id={id} role="tooltip" className="pointer-events-none fixed z-50 w-max max-w-[min(230px,calc(100vw-16px))] space-y-0.5 rounded-md border bg-background px-3 py-2 text-xs text-foreground shadow-md" style={{left:8,top:8,overflowWrap:'anywhere'}}><p className="font-semibold">{tip.feedback.date}</p><p>{tip.feedback.value}</p><p>{tip.feedback.series}</p></div>,document.body);
}
function MethodMarker({method, x, y}: {method: number; x: number; y: number}) {
  const props = {fill: 'var(--background)', stroke: colors[method], strokeWidth: 2};
  if (method === 1) return <rect x={x - 3.5} y={y - 3.5} width="7" height="7" {...props}/>;
  if (method === 2) return <path d={`M${x},${y - 5}l5,5 -5,5 -5,-5Z`} {...props}/>;
  return <circle cx={x} cy={y} r="3.5" {...props}/>;
}

/** Shared reading notes belong in the surrounding forecast's single disclosure. */
export function SyntheticDomainChartNotes({domain, data}: {domain: SyntheticDemoDomain; data: typeof artifact}) {
  const d = data.domains[domain], turnover = domain === 'turnover';
  const history = turnover ? d.history.filter(row => row.month >= '2026-01' && row.month <= '2026-09') : domain === 'hiring' ? d.history.slice(-12) : d.history;
  const bridge = turnover && history.some(row => hasChartValue(row.value)) && d.rows.length > 0;
  const cutoffDate = new Date(data.cutoff).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const zeroOpenings = domain === 'hiring' ? history.filter(row => row.value === null).map(row => period(row.month)) : [];
  const scale=forecastScale(domain,[...history.map(row=>row.value),...d.rows.flatMap(row=>row.values)]);
  const range=scale?`${formatDemoValue(domain,scale.min)}–${formatDemoValue(domain,scale.max)}${turnover?' exits':''}`:null;
  return <>{domain==='satisfaction'&&scale&&<p data-axis-note>Y axis: {range}{scale.min>0?' · does not start at zero':''}. Quarterly waves.</p>}<p>× means no value, not zero. Hover, focus or tap a point for its date, value and series.</p><p>{bridge
    ? 'September is unreleased. Faint long-dashed bridges connect August to October projections; they are not September observations.'
    : `Unreleased gap: ${d.gaps.map(period).join(', ') || 'none'}. ${domain === 'hiring' ? `These opening cohorts do not have fully reported 90-day outcomes at the ${cutoffDate} cutoff. ` : domain === 'satisfaction' ? 'December is one future quarterly wave. ' : ''}`}
    {' '}Missing history is not interpolated.{zeroOpenings.length > 0 ? ` ${zeroOpenings.join(', ')}: zero openings, so the rate is unavailable.` : ''}
  </p></>;
}

export function SyntheticDomainChart({domain, data, metricInSummary=false}: {domain: SyntheticDemoDomain; data: typeof artifact; metricInSummary?:boolean}) {
  const d = data.domains[domain], id = useId(), [tip, setTip] = useState<PointTip | null>(null), [width, setWidth] = useState(370), container = useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!tip)return;
    const dismiss=(event:PointerEvent)=>{if(!tip.anchor.contains(event.target as Node))setTip(null);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setTip(null);};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
  },[tip]);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [domain, data]);
  const ranking=domain==='hiring'?null:resolveProjectionBacktest(domain,data);
  const methodEntries=ranking?ranking.ranked.map(row=>({method:row.method,i:d.methods.indexOf(row.method)})):d.methods.map((method,i)=>({method,i}));
  const turnover = domain === 'turnover', cadence = domain === 'satisfaction' ? 3 : 1;
  const history = turnover ? d.history.filter(row => row.month >= '2026-01' && row.month <= '2026-09') : domain === 'satisfaction' ? d.history : d.history.slice(-12);
  const scale = forecastScale(domain, [...history.map(row => row.value), ...d.rows.flatMap(row => row.values)]);
  if (!scale || (!history.length && !d.rows.length)) return <p>Simulated history chart unavailable.</p>;
  const start = turnover ? '2026-01' : history[0]?.month ?? d.rows[0].month;
  const end = d.rows.at(-1)?.month ?? history.at(-1)!.month;
  const plotWidth = Math.max(1, width - 78), span = monthIndex(end) - monthIndex(start);
  const x = (month: string) => 58 + (span ? (monthIndex(month) - monthIndex(start)) / span : .5) * plotWidth;
  const y = (value: number) => 166 - (value - scale.min) / (scale.max - scale.min) * 136;
  const segments = historySegments(history, cadence), lastHistory = history.findLast(row => hasChartValue(row.value));
  const {ticks, rotated} = forecastDateTicks(start, end, cadence, plotWidth, d.rows[0]?.month);
  const boundary = d.rows.length ? Math.max(58, x(d.rows[0].month) - (span ? cadence / span * plotWidth / 2 : plotWidth / 2)) : null;
  const interaction = (feedback:PointFeedback, label=feedbackText(feedback)) => {
    const show=(event:SyntheticEvent<Element>)=>setTip({anchor:event.currentTarget,feedback});
    return {tabIndex:0,'aria-label':label,'aria-describedby':tip&&feedbackText(tip.feedback)===feedbackText(feedback)?id+'-tooltip':undefined,onFocus:show,onBlur:()=>setTip(null),onPointerEnter:(event:ReactPointerEvent<Element>)=>{if(event.pointerType!=='touch')show(event);},onPointerLeave:(event:ReactPointerEvent<Element>)=>{if(event.pointerType!=='touch'&&document.activeElement!==event.currentTarget)setTip(null);},onClick:show};
  };
  const range = `${formatDemoValue(domain, scale.min)}–${formatDemoValue(domain, scale.max)}${turnover ? ' exits' : ''}`;
  const cutoffDate = new Date(data.cutoff).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const unreleasedReason = domain === 'hiring'
    ? `90-day outcome not fully reported at the ${cutoffDate} cutoff; no observed value`
    : 'unreleased, no observed value';
  const bridge = turnover && lastHistory && d.rows.length > 0;
  const missing = [...history.filter(row => !hasChartValue(row.value)).map(row => ({month: row.month, reason: domain === 'hiring' ? 'zero openings; rate unavailable' : 'observed value unavailable'})), ...d.gaps.map(month => ({month, reason: unreleasedReason}))].filter(row => row.month >= start && row.month <= end);
  return <figure ref={container} aria-label={`${demoDomainCopy[domain].title}: simulated history and projections`} className="min-w-0 space-y-1">
    <figcaption className="text-xs font-medium">Simulated projections{!metricInSummary&&<> · {demoDomainCopy[domain].unit}</>}</figcaption>
    {domain!=='satisfaction'&&<p data-axis-note className="text-xs text-muted-foreground">Y axis: {range}{scale.min>0?' · does not start at zero':''}. {turnover?'Monthly counts':'Monthly opening cohorts'}.</p>}
    <svg viewBox={`0 0 ${width} ${rotated ? 260 : 220}`} role="img" aria-label={demoDomainCopy[domain].unit} aria-describedby={id} className="w-full overflow-visible" data-y-min={scale.min} data-y-max={scale.max}>
      <desc id={id}>Y axis {range}. Solid demo history; dashed projections from three comparison methods. Unreleased periods remain gaps. {bridge ? 'Faint long-dashed forecast bridges cross September without a September observation.' : ''} Values are available in the tables.</desc>
      {scale.ticks.map(value => <g key={value}><line x1="58" x2={width - 20} y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".16"/><text data-axis="y" x="52" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="12">{formatDemoValue(domain, value)}</text></g>)}
      {boundary !== null && <g data-region="projection"><rect x={boundary} y="24" width={width - 20 - boundary} height="146" fill="currentColor" opacity=".05"/><line x1={boundary} x2={boundary} y1="24" y2="170" stroke="currentColor" strokeDasharray="3 3" opacity=".4"/><text x={width - 20} y="16" textAnchor="end" fill="currentColor" fontSize="12">Projection</text></g>}
      {bridge && methodEntries.map(({method,i}) => hasChartValue(d.rows[0].values[i]) && <path key={method} data-series="forecast-bridge" aria-label={`${demoMethodLabels[method]}: forecast bridge from ${period(lastHistory.month)} to ${period(d.rows[0].month)}; September unavailable`} d={`M${x(lastHistory.month)},${y(lastHistory.value!)} L${x(d.rows[0].month)},${y(d.rows[0].values[i])}`} fill="none" stroke={colors[i]} strokeWidth="1.5" strokeDasharray="7 6" opacity=".5"/>)}
      {segments.map((rows, i) => <path key={i} d={rows.map((row, n) => `${n ? ' L' : 'M'}${x(row.month)},${y(row.value!)}`).join('')} fill="none" stroke="currentColor" strokeWidth="2" data-series="history"/>)}
      {methodEntries.flatMap(({method,i}) => historySegments(d.rows.map(row => ({month: row.month, value: row.values[i] ?? null})), cadence).map((rows, n) => <path key={method + n} data-series={method} d={rows.length === 1 ? `M${x(rows[0].month) - 8},${y(rows[0].value!)}h16` : rows.map((row, j) => `${j ? 'L' : 'M'}${x(row.month)},${y(row.value!)}`).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={dashes[i]}/>))}
      {ticks.map(row => <text data-axis="x" data-month={row.month} key={row.month} x={x(row.month)} y="184" transform={rotated ? `rotate(-90 ${x(row.month)} 184)` : undefined} textAnchor={rotated ? 'end' : 'middle'} fill="currentColor" fontSize="12">{row.label}{row.year && (rotated ? ` ${row.year}` : <tspan x={x(row.month)} dy="16">{row.year}</tspan>)}</text>)}
      {missing.map(row => <g key={row.month} data-missing={row.month} {...interaction({date:period(row.month),value:row.reason,series:'No value'},`${period(row.month)}: ${row.reason}`)}><path d={`M${x(row.month) - 3},163l6,6m-6,0l6,-6`} stroke="currentColor" strokeWidth="1.5"/><circle cx={x(row.month)} cy="166" r="10" fill="transparent"/></g>)}
      {history.filter(row => hasChartValue(row.value)).map(row => <circle key={row.month} data-point="history" data-month={row.month} data-value={row.value} cx={x(row.month)} cy={y(row.value!)} r="3" fill="currentColor" stroke="transparent" strokeWidth="14" {...interaction(forecastPointFeedback(domain,row.month,row.value))}/>)}
      {d.rows.flatMap(row => methodEntries.map(({method,i}) => hasChartValue(row.values[i]) && <g key={row.month + method} data-point="forecast" data-method={method} data-month={row.month} data-value={row.values[i]} {...interaction(forecastPointFeedback(domain,row.month,row.values[i],demoMethodLabels[method]))}><MethodMarker method={i} x={x(row.month)} y={y(row.values[i])}/><circle cx={x(row.month)} cy={y(row.values[i])} r="8" fill="transparent"/></g>))}
    </svg>
    <p role="status" className="sr-only">{tip?feedbackText(tip.feedback):''}</p>
    {tip&&<PointTooltip tip={tip} id={id+'-tooltip'}/>}
    <ul aria-label="Chart legend" className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><li>— Released history</li>{bridge && <li className="flex items-center gap-1"><svg width="22" height="12" aria-hidden="true"><line x1="0" x2="22" y1="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 6" opacity=".5"/></svg>Forecast bridge (no observation)</li>}{methodEntries.map(({method,i}) => <li key={method} className="flex items-center gap-1"><svg width="28" height="12" aria-hidden="true"><line x1="0" x2="28" y1="6" y2="6" stroke={colors[i]} strokeWidth="2" strokeDasharray={dashes[i]}/><MethodMarker method={i} x={14} y={6}/></svg>{demoMethodLabels[method]}</li>)}</ul>
  </figure>;
}
