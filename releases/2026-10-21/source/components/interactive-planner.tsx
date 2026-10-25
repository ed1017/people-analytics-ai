import {catalogProseDisplay} from '@/lib/catalog-display';
import type {ReactNode} from 'react';
import styles from './interactive-planner.module.css';
import decision from './decision-style.module.css';

const display=(value:ReactNode)=>typeof value==='string'?catalogProseDisplay(value):value;

/** Presentation only. Each adapter supplies outputs and controls from its existing calculator. */
export function InteractivePlanner({scope,outcome,metrics,levers,visual,actions,assumptions,children,compact=false}:{scope:ReactNode;outcome:ReactNode;metrics:{label:string;value:ReactNode}[];levers:ReactNode;visual:ReactNode;actions?:ReactNode;assumptions?:ReactNode;children?:ReactNode;compact?:boolean}){
 return <section className={`${decision.surface} ${styles.planner} ${compact?styles.compact:''}`} aria-label="Interactive scenario planner">
  <header className={decision.hero}><p className={styles.scope}>{display(scope)}</p><h3 className={styles.outcome}>{display(outcome)}</h3></header>
  <dl className={styles.metrics}>{metrics.map(metric=><div key={metric.label}><dt>{metric.label}</dt><dd>{display(metric.value)}</dd></div>)}</dl>
  <div className={styles.layout}><section className={styles.levers} aria-label="Scenario levers"><h4>Scenario levers</h4>{levers}</section><div className={styles.visual}>{visual}</div></div>
  {actions&&<div className={styles.actions}>{actions}</div>}
  {assumptions&&<p className={styles.assumptions}>{display(assumptions)}</p>}
  {children}
 </section>;
}
