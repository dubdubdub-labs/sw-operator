import { usePathname } from "next/navigation";

export function useCurrentEntity() {
  const pathname = usePathname();
  const pathParts = pathname.split("/");

  let entityId: string | null = null;

  // if first part is 'e', entityId is the second part
  if (pathParts[1] === "e" && pathParts[2]) {
    entityId = decodeURIComponent(pathParts[2]);
  }

  return {
    entityId,
  };
}
