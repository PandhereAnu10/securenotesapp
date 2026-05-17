import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Secure Notes",
  description: "Simple, secure notes with sharing and version history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${GeistMono.variable} dark h-full`}>
      <body className="min-h-full bg-obsidian-bg font-[family-name:var(--font-app)] text-foreground antialiased">
        {children}
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  );
}
