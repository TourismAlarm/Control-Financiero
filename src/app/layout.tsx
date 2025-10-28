import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import PWAInstaller from "@/components/PWAInstaller";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control Financiero",
  description: "Gestiona tus finanzas personales de manera inteligente con historial mensual",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinControl",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          {children}
          <PWAInstaller />
        </Providers>
      </body>
    </html>
  );
}
