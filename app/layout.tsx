import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DatasetBoundary } from "@/components/dataset-boundary";
import { connection } from "next/server";
import { datasetRouter } from "@/lib/dataset-runtime";
import "./globals.css";

const productTitle =
  "Insight to Action | People Analytics & Strategic Workforce Planning";

const productDescription =
  "Insight to Action is a public portfolio demo for people analytics and workforce planning, connecting workforce evidence, talent responses and planning scenarios with grounded AI assistance.";

export const metadata: Metadata = {
  title: productTitle,
  description: productDescription,
  openGraph: {
    title: productTitle,
    description: productDescription,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: productTitle,
    description: productDescription,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Selection must be read at request time, never embedded by a static build.
  await connection();
  const initialDatasetToken = await datasetRouter.bootstrapToken();
  return (
    <html lang="en" className="dark" data-workspace-preference="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html: `(function(){var p='light';try{var s=localStorage.getItem('people-analytics-workspace-palette-v1');if(s==='slate-blue'||s==='original-navy-teal')p='slate-blue'}catch(e){}document.documentElement.dataset.workspacePreference=p})()`}} /></head>
      <body>
        <DatasetBoundary initialToken={initialDatasetToken}>{children}</DatasetBoundary>
        <Analytics />
      </body>
    </html>
  );
}
