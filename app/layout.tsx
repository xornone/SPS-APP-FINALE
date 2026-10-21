import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PullToRefresh } from "@/components/PullToRefresh";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SPS — Sorties",
  description: "L'application du club de cyclisme SPS : sorties, parcours et participation.",
  appleWebApp: {
    capable: true,
    title: "SPS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#130D1A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://mt0.google.com" crossOrigin="" />
        <link rel="preconnect" href="https://mt1.google.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://mt0.google.com" />
        <link rel="dns-prefetch" href="https://api.open-meteo.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sps-theme');var d=document.documentElement.classList;if(t==='light'){d.remove('dark')}else{d.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`min-h-dvh antialiased ${bebas.variable} ${manrope.variable}`}>
        <PullToRefresh />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
