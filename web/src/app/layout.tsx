import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] antialiased`}>
        <Providers>
          <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-6">
            <header className="flex items-center justify-between border-b border-line pb-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Fade
              </Link>
              <nav className="flex gap-5 text-sm text-muted">
                <Link href="/" className="hover:text-foreground">
                  Play
                </Link>
                <Link href="/table" className="hover:text-foreground">
                  Table
                </Link>
              </nav>
            </header>
            <main className="flex-1 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
