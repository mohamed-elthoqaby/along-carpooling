import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { DirectionProvider } from "@/components/shell/DirectionContext";
import { AppShell } from "@/components/shell/AppShell";
import { SwRegister } from "@/components/pwa/SwRegister";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Along — Carpool your way.",
  description:
    "Map-first peer-to-peer carpooling platform with Uber H3 spatial indexing, smart luggage fit checks, and standby booking.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1E90FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#F7F9FC] text-[#050412]">
        <SwRegister />
        <DirectionProvider>
          <Suspense
            fallback={
              <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#F7F9FC] text-sm font-medium text-[#5E6878]">
                Loading Along...
              </div>
            }
          >
            <AppShell>{children}</AppShell>
          </Suspense>
        </DirectionProvider>
      </body>
    </html>
  );
}
