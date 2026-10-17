import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DatasetBoundary } from "@/components/dataset-boundary";
import { connection } from "next/server";
import { datasetRouter, isLocal9037Development } from "@/lib/dataset-runtime";
import "./globals.css";

const productTitle =
  "Workforce Intelligence | Strategic Workforce Planning";

const productDescription =
  "Workforce Intelligence is a public portfolio demo with strategic workforce planning at its core, connecting workforce evidence, talent responses and planning scenarios with grounded AI assistance.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ed-ai.app"),
  title: productTitle,
  description: productDescription,
  openGraph: {
    title: productTitle,
    description: productDescription,
    type: "website",
    url: "/",
    siteName: "Workforce Intelligence",
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/opengraph-image", alt: "Workforce Intelligence by Ed Om. Explore evidence, compare assumptions, and save a plan. Portfolio demo with synthetic workforce data." }],
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
        {!isLocal9037Development && <Analytics />}
      </body>
    </html>
  );
}
