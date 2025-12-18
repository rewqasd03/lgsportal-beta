import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Başarı Takip ve Raporlama Sistemi",
  description: "Öğrenci başarı takip sistemi - HeatMap ve Akıllı Raporlar",
  applicationName: "Başarı Takip",
  appleWebApp: {
    capable: true,
    title: "Başarı Takip",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://example.com",
    siteName: "Başarı Takip Sistemi",
    title: "Başarı Takip ve Raporlama Sistemi",
    description: "Öğrenci başarı takip sistemi - HeatMap ve Akıllı Raporlar",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Başarı Takip Sistemi"
      }
    ]
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
  keywords: ["eğitim", "başarı takip", "LGS", "öğrenci", "rapor", "analiz", "heatmap"],
  authors: [{ name: "MiniMax Agent" }],
  robots: "index, follow"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3B82F6"
};

// Service Worker kaydı için Client Component

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}