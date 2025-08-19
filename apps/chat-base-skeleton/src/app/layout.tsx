"use client";

import { useChats } from "@repo/chat-base-hooks";
import { ChatBaseRootLayout } from "@repo/chat-base-root-layout";
import {
  ChatBaseAppSidebar,
  type ChatBaseAppSidebarItemGroups,
} from "@repo/chat-base-sidebar";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import "@repo/ui/globals.css";
import { cn } from "@repo/ui/lib/utils";
import { SquarePenIcon } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";

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
  const { chats, createChat } = useChats();
  const pathname = usePathname();

  const LIMIT = 4;
  const mostRecentChats = chats?.slice(0, LIMIT);

  const itemGroups: ChatBaseAppSidebarItemGroups = [
    {
      groupLabel: "Chats",
      items: [
        {
          type: "button" as const,
          key: "new-chat",
          title: "New chat",
          onClick: () => {
            createChat();
          },
          icon: SquarePenIcon,
        },
        ...(mostRecentChats?.map((chat) => ({
          type: "link" as const,
          key: chat.id,
          title: chat.title ?? "Untitled chat",
          url: `/chat/${chat.id}`,
          isActive: pathname.startsWith(`/chat/${chat.id}`),
        })) ?? []),
      ],
    },
  ];

  return (
    <ChatBaseRootLayout
      bodyClassName={cn(`${geistSans.variable} ${geistMono.variable}`)}
    >
      <SidebarProvider>
        <ChatBaseAppSidebar itemGroups={itemGroups} />
        <main className="h-screen flex-1 overflow-hidden">{children}</main>
      </SidebarProvider>
    </ChatBaseRootLayout>
  );
}
