import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatsAppMe - Real-Time Chat App",
  description: "A full-stack real-time messaging web app built with Next.js, React, Node.js, MongoDB, and Socket.IO. Chat one-on-one or in groups, share messages, and see user statuses in real-time.",
  keywords: ["WhatsApp Clone", "Next.js", "React", "Node.js", "MongoDB", "Socket.IO", "Real-Time Chat", "Messaging App"],
  authors: [{ name: "Kang Adhim" }],
  icons: {
    icon: "/whatsapp.svg",
    shortcut: "/whatsapp.svg",
    apple: "/whatsapp.svg",
  },
  openGraph: {
    title: "WhatsApp Clone",
    description: "Real-time chat app with one-on-one and group messaging",
    url: "http://localhost:3000",
    siteName: "WhatsApp Clone",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Clone",
    description: "Real-time chat app with one-on-one and group messaging",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
