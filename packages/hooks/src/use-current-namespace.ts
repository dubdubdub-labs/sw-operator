import { dangerousUnsafeDb, db } from "@repo/db-core/client";
import type { UseNamespacesQueryProps } from "@repo/sw-instantdb";

const PAGE_SIZE = 50;

interface UseCurrentNamespaceProps
  extends UseNamespacesQueryProps<typeof dangerousUnsafeDb> {
  entityId: string;
}

export const useCurrentNamespace = ({ entityId }: UseCurrentNamespaceProps) => {
  const { namespaces } = db.explorer.useSchemaQuery({
    db: dangerousUnsafeDb,
  });
  const { allCount, itemsRes } = db.explorer.useNamespacesQuery({
    selectedNs: namespaces?.find((ns) => ns.id === entityId),
    limit: PAGE_SIZE,
    db: dangerousUnsafeDb,
  });

  const selectedNs = namespaces?.find((ns) => ns.id === entityId);

  return { namespace: selectedNs, allCount, itemsRes };
};
