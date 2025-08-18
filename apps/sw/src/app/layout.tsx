import "./globals.css";
import { cn } from "@repo/ui/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";
import { MetaAgentChat } from "@/components/meta-agent-chat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full overscroll-none" lang="en">
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} h-full overscroll-none bg-[url('/tahoe-bg-6k.png')] bg-center bg-cover antialiased`
        )}
      >
        <div className="absolute inset-0 z-0 bg-white/25 backdrop-blur-3xl" />
        <main className="relative z-10">{children}</main>
        <MetaAgentChat />
      </body>
    </html>
  );
}
