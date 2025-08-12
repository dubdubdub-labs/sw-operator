import { db, type UseNamespacesQueryProps } from "@repo/db-client";

const PAGE_SIZE = 50;

interface UseCurrentNamespaceProps extends UseNamespacesQueryProps {
  entityId: string;
}

export const useCurrentNamespace = ({ entityId }: UseCurrentNamespaceProps) => {
  const { namespaces } = db.explorer.useSchemaQuery();
  const { allCount, itemsRes } = db.explorer.useNamespacesQuery({
    selectedNs: namespaces?.find((ns) => ns.id === entityId),
    limit: PAGE_SIZE,
  });

  const selectedNs = namespaces?.find((ns) => ns.id === entityId);

  return { namespace: selectedNs, allCount, itemsRes };
};
