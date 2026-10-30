import type {Metadata} from 'next';
import Link from 'next/link';
import {ProjectCaseStudy} from '@/components/project-case-study';
export const metadata:Metadata={title:'About | Workforce Intelligence'};
const linkStyle='inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export default function AboutPage(){return <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:px-5">
 <Link href="/" className={linkStyle}>Back to Workforce Intelligence</Link>
 <header className="space-y-2 rounded-2xl bg-primary px-5 py-4 text-primary-foreground sm:px-7">
  <p className="text-sm font-medium">Developed by Ed Om · Synthetic workforce data</p>
  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Turn workforce evidence into a staffing decision.</h1>
  <p className="max-w-2xl leading-relaxed">Workforce Intelligence connects people analytics with adjustable planning scenarios. Explore the workforce, compare staffing choices, and keep the assumptions behind a recommendation visible.</p>
 </header>
 <ProjectCaseStudy expanded/>
 <section aria-labelledby="about-contact" className="border-t pt-3">
  <h2 id="about-contact" className="text-xl font-semibold">Connect with Ed Om</h2>
  <nav aria-label="Public project and contact links" className="mt-2 flex flex-wrap gap-2">
   <a className={linkStyle} href="mailto:edwinom.nyc@gmail.com"><span className="break-all">edwinom.nyc@gmail.com</span></a>
   <a className={linkStyle} href="https://www.linkedin.com/in/ed-om-62a57818" target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens a new tab)</span></a>
   <a className={linkStyle} href="https://github.com/ed1017/people-analytics-ai" target="_blank" rel="noopener noreferrer">Public source on GitHub<span className="sr-only"> (opens a new tab)</span></a>
  </nav>
 </section>
 </main>;}
