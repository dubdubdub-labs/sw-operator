import { usePathname } from "next/navigation";

export function useCurrentMutationFullPath() {
  const pathname = usePathname();
  const pathParts = pathname.split("/");

  let mutationFullPath: string | null = null;

  if (pathParts[1] === "m" && pathParts[2]) {
    mutationFullPath = decodeURIComponent(pathParts[2]);
  }

  return {
    mutationFullPath,
  };
}
