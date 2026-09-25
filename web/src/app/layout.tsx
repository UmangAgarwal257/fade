import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Nav } from "@/components/nav";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fade",
  description: "Call which PreStock trades cheap or rich versus its mark. The pick is a devnet transaction.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.devnet.solana.com" />
        <link rel="preconnect" href="https://www.prestocks.com" />
        <link rel="dns-prefetch" href="https://api.devnet.solana.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] antialiased`}>
        <Providers>
          <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-6">
            <Nav />
            <main className="flex-1 py-8">{children}</main>
          </div>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
