import { usePathname } from "next/navigation";

export function useCurrentQueryFullPath() {
  const pathname = usePathname();
  const pathParts = pathname.split("/");

  let queryFullPath: string | null = null;

  if (pathParts[1] === "q" && pathParts[2]) {
    queryFullPath = decodeURIComponent(pathParts[2]);
  }

  return {
    queryFullPath,
  };
}
