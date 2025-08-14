import { RootLayout } from "@repo/root-layout";
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

export function ChatBaseRootLayout({
  children,
  htmlClassName,
  bodyClassName,
}: Readonly<{
  children: React.ReactNode;
  htmlClassName?: string;
  bodyClassName?: string;
}>) {
  return (
    <RootLayout
      bodyClassName={cn(
        `${geistSans.variable} ${geistMono.variable}`,
        bodyClassName
      )}
      htmlClassName={cn("", htmlClassName)}
    >
      {children}
    </RootLayout>
  );
}
