import { SidebarProvider } from "@repo/ui/components/sidebar";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
