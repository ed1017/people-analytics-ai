'use client';
import {useEffect, useId, useRef, useState} from 'react';
import artifact from '@/lib/data/synthetic-domain-demo-v1.json';
import {demoMethodLabels, demoDomainCopy, formatDemoValue, type SyntheticDemoDomain} from '@/lib/synthetic-domain-demo';
import {chartPeriod as period, monthIndex, forecastScale, forecastDateTicks, historySegments, hasChartValue} from '@/lib/forecast-chart-layout';

const colors = ['#2563eb', '#b45309', '#a855f7'];
const dashes = ['2 4', '5 4', '8 3 2 3'];
function MethodMarker({method, x, y}: {method: number; x: number; y: number}) {
  const props = {fill: 'var(--background)', stroke: colors[method], strokeWidth: 2};
  if (method === 1) return <rect x={x - 3.5} y={y - 3.5} width="7" height="7" {...props}/>;
  if (method === 2) return <path d={`M${x},${y - 5}l5,5 -5,5 -5,-5Z`} {...props}/>;
  return <circle cx={x} cy={y} r="3.5" {...props}/>;
}

export function SyntheticDomainChart({domain, data}: {domain: SyntheticDemoDomain; data: typeof artifact}) {
  const d = data.domains[domain], id = useId(), [tip, setTip] = useState<string | null>(null), [width, setWidth] = useState(370), container = useRef<HTMLElement>(null);
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
  const turnover = domain === 'turnover', cadence = domain === 'satisfaction' ? 3 : 1;
  const history = turnover ? d.history.filter(row => row.month >= '2026-01' && row.month <= '2026-09') : domain === 'satisfaction' ? d.history : d.history.slice(-12);
  const scale = forecastScale(domain, [...history.map(row => row.value), ...d.rows.flatMap(row => row.values)]);
  if (!scale || (!history.length && !d.rows.length)) return <p>Simulated history chart unavailable.</p>;
  const start = turnover ? '2026-01' : history[0]?.month ?? d.rows[0].month;
  const end = d.rows.at(-1)?.month ?? history.at(-1)!.month;
  const plotWidth = Math.max(1, width - 78), span = monthIndex(end) - monthIndex(start);
  const x = (month: string) => 58 + (span ? (monthIndex(month) - monthIndex(start)) / span : .5) * plotWidth;
  const y = (value: number) => 186 - (value - scale.min) / (scale.max - scale.min) * 156;
  const segments = historySegments(history, cadence), lastHistory = history.findLast(row => hasChartValue(row.value));
  const {ticks, rotated} = forecastDateTicks(start, end, cadence, plotWidth, d.rows[0]?.month);
  const boundary = d.rows.length ? Math.max(58, x(d.rows[0].month) - (span ? cadence / span * plotWidth / 2 : plotWidth / 2)) : null;
  const label = (month: string, value: number, name: string) => `${period(month)} · ${name}: ${formatDemoValue(domain, value)}${turnover ? ' exits' : ''}`;
  const interaction = (text: string) => ({tabIndex: 0, 'aria-label': text, onFocus: () => setTip(text), onBlur: () => setTip(null), onMouseEnter: () => setTip(text), onMouseLeave: () => setTip(null)});
  const range = `${formatDemoValue(domain, scale.min)}–${formatDemoValue(domain, scale.max)}${turnover ? ' exits' : ''}`;
  const bridge = turnover && lastHistory && d.rows.length > 0;
  const gapNote = bridge
    ? 'September is unreleased. Faint long-dashed bridges connect August to October projections; they are not September observations.'
    : `Unreleased gap: ${d.gaps.map(period).join(', ') || 'none'}. ${domain === 'satisfaction' ? 'December is one future quarterly wave. ' : ''}No history-to-forecast interpolation.`;
  const missing = [...history.filter(row => !hasChartValue(row.value)).map(row => ({month: row.month, reason: domain === 'hiring' ? 'zero openings; rate unavailable' : 'observed value unavailable'})), ...d.gaps.map(month => ({month, reason: 'unreleased, no observed value'}))].filter(row => row.month >= start && row.month <= end);
  const zeroOpenings = domain === 'hiring' ? history.filter(row => row.value === null).map(row => period(row.month)) : [];
  return <figure ref={container} aria-label={`${demoDomainCopy[domain].title}: simulated history and projections`} className="min-w-0 space-y-2">
    <figcaption className="text-xs font-medium">Simulated history → projections<span className="mt-1 block">{demoDomainCopy[domain].unit}</span></figcaption>
    <p data-axis-note className="text-xs">Y axis: {range}{scale.min > 0 ? ' · does not start at zero' : ''}. {cadence === 3 ? 'Quarterly waves' : turnover ? 'Monthly counts' : 'Monthly opening cohorts'}.</p>
    <svg viewBox={`0 0 ${width} 280`} role="img" aria-labelledby={id} className="w-full overflow-visible" data-y-min={scale.min} data-y-max={scale.max}>
      <title id={id}>{demoDomainCopy[domain].unit}. Y axis {range}. Solid released history; dashed projections from unselected methods. Unreleased periods remain gaps. {bridge ? 'Faint long-dashed forecast bridges cross September without a September observation.' : ''} Values are available in the tables.</title>
      {scale.ticks.map(value => <g key={value}><line x1="58" x2={width - 20} y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".16"/><text data-axis="y" x="52" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="12">{formatDemoValue(domain, value)}</text></g>)}
      {boundary !== null && <g data-region="projection"><rect x={boundary} y="24" width={width - 20 - boundary} height="166" fill="currentColor" opacity=".05"/><line x1={boundary} x2={boundary} y1="24" y2="190" stroke="currentColor" strokeDasharray="3 3" opacity=".4"/><text x={width - 20} y="16" textAnchor="end" fill="currentColor" fontSize="12">Projection</text></g>}
      {bridge && d.methods.map((method, i) => hasChartValue(d.rows[0].values[i]) && <path key={method} data-series="forecast-bridge" aria-label={`${demoMethodLabels[method]}: forecast bridge from ${period(lastHistory.month)} to ${period(d.rows[0].month)}; September unavailable`} d={`M${x(lastHistory.month)},${y(lastHistory.value!)} L${x(d.rows[0].month)},${y(d.rows[0].values[i])}`} fill="none" stroke={colors[i]} strokeWidth="1.5" strokeDasharray="7 6" opacity=".5"/>)}
      {segments.map((rows, i) => <path key={i} d={rows.map((row, n) => `${n ? ' L' : 'M'}${x(row.month)},${y(row.value!)}`).join('')} fill="none" stroke="currentColor" strokeWidth="2" data-series="history"/>)}
      {d.methods.flatMap((method, i) => historySegments(d.rows.map(row => ({month: row.month, value: row.values[i] ?? null})), cadence).map((rows, n) => <path key={method + n} data-series={method} d={rows.length === 1 ? `M${x(rows[0].month) - 8},${y(rows[0].value!)}h16` : rows.map((row, j) => `${j ? 'L' : 'M'}${x(row.month)},${y(row.value!)}`).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={dashes[i]}/>))}
      {ticks.map(row => <text data-axis="x" data-month={row.month} key={row.month} x={x(row.month)} y="204" transform={rotated ? `rotate(-90 ${x(row.month)} 204)` : undefined} textAnchor={rotated ? 'end' : 'middle'} fill="currentColor" fontSize="12">{row.label}{row.year && (rotated ? ` ${row.year}` : <tspan x={x(row.month)} dy="16">{row.year}</tspan>)}</text>)}
      {missing.map(row => <g key={row.month} data-missing={row.month} {...interaction(`${period(row.month)}: ${row.reason}`)}><title>{period(row.month)}: {row.reason}</title><path d={`M${x(row.month) - 3},183l6,6m-6,0l6,-6`} stroke="currentColor" strokeWidth="1.5"/></g>)}
      {turnover && d.gaps.includes('2026-09') && <text x={x('2026-09')} y="277" textAnchor="middle" fill="currentColor" fontSize="12">Sep unavailable</text>}
      {history.filter(row => hasChartValue(row.value)).map(row => <circle key={row.month} data-point="history" data-month={row.month} cx={x(row.month)} cy={y(row.value!)} r="3" fill="currentColor" {...interaction(label(row.month, row.value!, 'Released history'))}><title>{label(row.month, row.value!, 'Released history')}</title></circle>)}
      {d.rows.flatMap(row => d.methods.map((method, i) => hasChartValue(row.values[i]) && <g key={row.month + method} data-point="forecast" data-method={method} data-month={row.month} {...interaction(label(row.month, row.values[i], demoMethodLabels[method]))}><title>{label(row.month, row.values[i], demoMethodLabels[method])}</title><MethodMarker method={i} x={x(row.month)} y={y(row.values[i])}/></g>))}
    </svg>
    <p className="text-xs">{gapNote}{missing.length > 0 ? ' × on the date axis means no value, not zero.' : ''}{zeroOpenings.length > 0 ? ` ${zeroOpenings.join(', ')}: zero openings, so the rate is unavailable.` : ''}</p>
    <p role="status" className="min-h-8 text-xs">{tip ?? 'Focus or hover a point for its date, method and value.'}</p>
    <ul aria-label="Chart legend" className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><li>— Released history</li>{bridge && <li className="flex items-center gap-1"><svg width="22" height="12" aria-hidden="true"><line x1="0" x2="22" y1="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 6" opacity=".5"/></svg>Forecast bridge (no observation)</li>}{d.methods.map((method, i) => <li key={method} className="flex items-center gap-1"><svg width="28" height="12" aria-hidden="true"><line x1="0" x2="28" y1="6" y2="6" stroke={colors[i]} strokeWidth="2" strokeDasharray={dashes[i]}/><MethodMarker method={i} x={14} y={6}/></svg>{demoMethodLabels[method]}</li>)}</ul>
  </figure>;
}
