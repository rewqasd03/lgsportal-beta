import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Köprüler LGS Portalı",
  description: "Modern LGS öğrenci başarı takip sistemi",
  applicationName: "Köprüler LGS Portalı",
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
    siteName: "Köprüler LGS Portalı",
    title: "Köprüler LGS Portalı",
    description: "Modern LGS öğrenci başarı takip sistemi",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Köprüler LGS Portalı"
      }
    ]
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
  keywords: ["eğitim", "LGS", "öğrenci", "başarı", "portal", "köprüler"],
  authors: [{ name: "Murat UYSAL" }],
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