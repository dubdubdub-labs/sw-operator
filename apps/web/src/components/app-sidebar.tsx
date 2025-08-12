"use client";

import {
  useRegisteredMutations,
  useRegisteredQueries,
  useSchemaQuery,
} from "@repo/hooks";
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
import Link from "next/link";
import { useCurrentEntity } from "@/hooks/use-current-entity";
import { useCurrentMutationFullPath } from "@/hooks/use-current-mutation";
import { useCurrentQueryFullPath } from "@/hooks/use-current-query";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <DBEntitiesSidebarGroup />
        <DBQueriesSidebarGroup />
        <MutationSidebarGroup />
      </SidebarContent>
    </Sidebar>
  );
}

function DBEntitiesSidebarGroup() {
  const { namespaces } = useSchemaQuery();
  const { entityId } = useCurrentEntity();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Entities</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {namespaces?.map((namespace) => (
            <SidebarMenuItem key={namespace.id}>
              <SidebarMenuButton asChild isActive={namespace.id === entityId}>
                <Link href={`/e/${encodeURIComponent(namespace.id)}`}>
                  <span>{namespace.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function DBQueriesSidebarGroup() {
  const { registeredQueriesFlatArr } = useRegisteredQueries();
  const { queryFullPath } = useCurrentQueryFullPath();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Queries</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {registeredQueriesFlatArr?.map(({ fullPath }) => (
            <SidebarMenuItem key={fullPath}>
              <SidebarMenuButton asChild isActive={queryFullPath === fullPath}>
                <Link href={`/q/${encodeURIComponent(fullPath)}`}>
                  <span>{fullPath}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function MutationSidebarGroup() {
  const { registeredMutationsFlatArr } = useRegisteredMutations();
  const { mutationFullPath } = useCurrentMutationFullPath();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Mutations</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {registeredMutationsFlatArr?.map(({ fullPath }) => (
            <SidebarMenuItem key={fullPath}>
              <SidebarMenuButton
                asChild
                isActive={mutationFullPath === fullPath}
              >
                <Link href={`/m/${encodeURIComponent(fullPath)}`}>
                  <span>{fullPath}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
