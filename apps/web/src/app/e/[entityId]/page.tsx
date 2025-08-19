"use client";

import { dangerousUnsafeDb } from "@repo/db-core/client";
import { useCurrentNamespace } from "@repo/hooks";
import { use } from "react";
import { Grid } from "@/components/grid";
import type { EntityPageGridContext } from "@/components/grid/entity-page-contexts";
import {
  getColDefsFromAttrs,
  getRowDataFromItemsRes,
} from "@/components/grid/utils";
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

  console.log("itemsRes", itemsRes);
  console.log("colDefs", namespace?.attrs);
  console.log("namespace", namespace);
  console.log("data", itemsRes.data);

  const rowData = getRowDataFromItemsRes({
    attrs: namespace?.attrs ?? [],
    itemsRes,
    entityId,
  });

  return (
    <div className="flex h-full w-full">
      <Grid colDefs={colDefs} context={context} rowData={rowData} />
    </div>
  );
}
