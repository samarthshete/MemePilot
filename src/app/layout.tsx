import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Archivo = display/body (variable font); Space Mono = numerals/tickers.
// next/font self-hosts both with `display: swap` → no layout shift, no FOUT flash.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const title = "ChadWallet — find the next 100x memecoins";
const description =
  "Get ChadWallet: the social-first, non-custodial Solana memecoin wallet. Discover trending coins, follow the smartest traders, and ape in seconds — no seed phrase.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "ChadWallet",
  // Only the real production host is indexable; preview/dev emit noindex.
  robots: IS_INDEXABLE ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ChadWallet",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#020818",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-clip bg-cw-bg font-sans text-cw-text">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
