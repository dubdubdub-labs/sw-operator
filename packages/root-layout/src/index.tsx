import "@repo/ui/globals.css";
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

export function RootLayout({
  children,
  htmlClassName,
  bodyClassName,
}: Readonly<{
  children: React.ReactNode;
  htmlClassName?: string;
  bodyClassName?: string;
}>) {
  return (
    <html className={cn("h-full overscroll-none", htmlClassName)} lang="en">
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} h-full overscroll-none antialiased`,
          bodyClassName
        )}
      >
        {children}
      </body>
    </html>
  );
}
