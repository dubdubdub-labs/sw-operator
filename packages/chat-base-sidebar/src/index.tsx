import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import "@repo/ui/globals.css";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type ChatBaseAppSidebarLink = {
  type: "link";
  key: string;
  title: string;
  url: string;
  isActive?: boolean;
  icon?: LucideIcon;
};

type ChatBaseAppSidebarButton = {
  type: "button";
  key: string;
  title: string;
  onClick: () => void;
  icon?: LucideIcon;
};

type ChatBaseAppSidebarItem = ChatBaseAppSidebarLink | ChatBaseAppSidebarButton;

export type ChatBaseAppSidebarItemGroups = {
  groupLabel: string;
  items: ChatBaseAppSidebarItem[];
}[];

export function ChatBaseAppSidebar({
  itemGroups,
}: {
  itemGroups: ChatBaseAppSidebarItemGroups;
}) {
  return (
    <Sidebar>
      <SidebarContent>
        {itemGroups.map((group) => (
          <SidebarGroup key={group.groupLabel}>
            <SidebarGroupLabel>{group.groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (item.type === "link") {
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton asChild isActive={item.isActive}>
                          {/* biome-ignore lint/suspicious/noExplicitAny: TODO: I need to find a way to fix this with NextJS's new typed routes! */}
                          <Link href={item.url as any}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  if (item.type === "button") {
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton onClick={item.onClick}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return null;
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
