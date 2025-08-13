import "@repo/ui/globals.css";
import { ChatBaseRootLayout } from "@repo/chat-base-root-layout";
import { cn } from "@repo/ui/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";

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
    <ChatBaseRootLayout
      bodyClassName={cn(`${geistSans.variable} ${geistMono.variable}`)}
    >
      {children}
    </ChatBaseRootLayout>
  );
}
