"use client";

import { dangerousUnsafeDb } from "@repo/db-core/client";
import { useCurrentNamespace } from "@repo/hooks";

export function EntityPageHeader({ entityId }: { entityId: string }) {
  const { namespace, allCount } = useCurrentNamespace({
    db: dangerousUnsafeDb,
    entityId,
  });
  return (
    <div className="flex h-12 items-center border-b px-3">
      EntityPageHeader: {entityId} {namespace?.name} {allCount}
    </div>
  );
}
