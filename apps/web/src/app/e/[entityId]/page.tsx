"use client";

import { dangerousUnsafeDb } from "@repo/db-core/client";
import { useCurrentNamespace } from "@repo/hooks";
import { use } from "react";
import { Grid } from "@/components/grid";
import type { EntityPageGridContext } from "@/components/grid/entity-page-contexts";
import { getColDefsFromAttrs } from "@/components/grid/utils";
import type { EntityPageParams } from "./params";

export default function EntityPage({
  params,
}: {
  params: Promise<EntityPageParams>;
}) {
  const { entityId: encodedEntityId } = use(params);
  const entityId = decodeURIComponent(encodedEntityId);
  const { itemsRes, namespace } = useCurrentNamespace({
    db: dangerousUnsafeDb,
    entityId,
  });

  const colDefs = getColDefsFromAttrs(namespace?.attrs ?? []);

  const context: EntityPageGridContext = {
    entityId,
  };

  return (
    <div className="flex h-full w-full">
      <Grid
        colDefs={colDefs}
        context={context}
        rowData={itemsRes.data?.[entityId] ?? []}
      />
    </div>
  );
}
