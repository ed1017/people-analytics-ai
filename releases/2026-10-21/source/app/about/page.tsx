import type {Metadata} from 'next';
import Link from 'next/link';
import {ProjectCaseStudy} from '@/components/project-case-study';
export const metadata:Metadata={title:'About | Workforce Intelligence'};
export default function AboutPage(){return <main className="mx-auto max-w-3xl space-y-4 px-5 py-8"><Link href="/" className="inline-block rounded underline underline-offset-4 focus-visible:ring-2">Back to Workforce Intelligence</Link><h1 className="text-2xl font-semibold">Workforce planning by Ed Om</h1><p>An independently developed portfolio project, built with AI assistance.</p><p>Workforce data is synthetic. Public reference data retains its own sources and dates. Planning outputs are conditional, not verified business outcomes.</p><ProjectCaseStudy/></main>;}
