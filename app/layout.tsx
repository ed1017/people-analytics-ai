import type { Metadata } from "next";
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
  "Workforce AI | People Analytics & Strategic Workforce Planning";

const productDescription =
  "Public portfolio MVP for People Analytics and Strategic Workforce Planning, with workforce dashboards, skills intelligence, scenario planning, workforce response and execution feasibility, and grounded AI assistance.";

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
      </body>
    </html>
  );
}