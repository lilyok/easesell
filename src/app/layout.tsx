import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { AppProvider } from "@/context/app-context";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EaseSell — list used items faster",
  description:
    "Snap photos, auto-draft listings from image search, and send them to Facebook Marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-[color:var(--es-ink)]">
        <AppProvider>
          <div className="es-atmosphere" aria-hidden />
          <SiteHeader />
          <main className="relative z-10 flex flex-1 flex-col">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
