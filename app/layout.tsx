import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExpireGuard Pro - Expiration Tracker",
  description: "Retail and warehouse product expiration tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Material+Symbols+Outlined&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background font-sans">
        {children}
      </body>
    </html>
  );
}
