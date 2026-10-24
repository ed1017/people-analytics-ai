import type {ReactNode} from 'react';
import styles from './interactive-planner.module.css';

/** Presentation only. Each adapter supplies outputs and controls from its existing calculator. */
export function InteractivePlanner({scope,outcome,metrics,levers,visual,actions,assumptions,children}:{scope:ReactNode;outcome:ReactNode;metrics:{label:string;value:ReactNode}[];levers:ReactNode;visual:ReactNode;actions?:ReactNode;assumptions?:ReactNode;children?:ReactNode}){
 return <section className={styles.planner} aria-label="Interactive scenario planner">
  <header><p className={styles.scope}>{scope}</p><h3 className={styles.outcome}>{outcome}</h3></header>
  <dl className={styles.metrics}>{metrics.map(metric=><div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>
  <div className={styles.layout}><section className={styles.levers} aria-label="Scenario levers"><h4>Scenario levers</h4>{levers}</section><div className={styles.visual}>{visual}</div></div>
  {actions&&<div className={styles.actions}>{actions}</div>}
  {assumptions&&<p className={styles.assumptions}>{assumptions}</p>}
  {children}
 </section>;
}
