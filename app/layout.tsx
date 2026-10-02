import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const productTitle =
  "Insights to Action | People Analytics & Strategic Workforce Planning";

const productDescription =
  "Insights to Action is a public portfolio demo for people analytics and workforce planning, connecting workforce evidence, talent responses and planning scenarios with grounded AI assistance.";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
