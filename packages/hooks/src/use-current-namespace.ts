import { dangerousUnsafeDb, db } from "@repo/db-core/client";
import type { UseNamespacesQueryProps } from "@repo/sw-instantdb";

interface UseCurrentNamespaceProps
  extends UseNamespacesQueryProps<typeof dangerousUnsafeDb> {
  entityId: string;
  limit?: number;
  offset?: number;
}

export const useCurrentNamespace = ({
  entityId,
  limit = 50,
  offset = 0,
}: UseCurrentNamespaceProps) => {
  const { namespaces } = db.explorer.useSchemaQuery({
    db: dangerousUnsafeDb,
  });
  const { allCount, itemsRes } = db.explorer.useNamespacesQuery({
    selectedNs: namespaces?.find((ns) => ns.id === entityId),
    limit,
    offset,
    db: dangerousUnsafeDb,
  });

  const selectedNs = namespaces?.find((ns) => ns.id === entityId);

  return { namespace: selectedNs, allCount, itemsRes };
};
