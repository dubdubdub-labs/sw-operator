"use client";

import { dangerousUnsafeDb } from "@repo/db-core/client";
import { useCurrentNamespace } from "@repo/hooks";
import { use } from "react";
import { Grid } from "@/components/grid";
import type { EntityPageGridContext } from "@/components/grid/entity-page-contexts";
import { GridFooter } from "@/components/grid/grid-footer";
import {
  getColDefsFromAttrs,
  getRowDataFromItemsRes,
} from "@/components/grid/utils";
import { useExplorerStore } from "@/stores/explorer-store";
import type { EntityPageParams } from "./params";

export default function EntityPage({
  params,
}: {
  params: Promise<EntityPageParams>;
}) {
  const { entityId: encodedEntityId } = use(params);
  const entityId = decodeURIComponent(encodedEntityId);

  const { getCurrentPage, getRowsPerPage } = useExplorerStore();
  const currentPage = getCurrentPage(entityId);
  const rowsPerPage = getRowsPerPage(entityId);

  const { itemsRes, namespace } = useCurrentNamespace({
    db: dangerousUnsafeDb,
    entityId,
    limit: rowsPerPage,
    offset: currentPage * rowsPerPage,
  });

  const colDefs = getColDefsFromAttrs(namespace?.attrs ?? []);

  const context: EntityPageGridContext = {
    entityId,
  };

  const rowData = getRowDataFromItemsRes({
    attrs: namespace?.attrs ?? [],
    itemsRes,
    entityId,
  });

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col">
      <Grid colDefs={colDefs} context={context} rowData={rowData} />
      <GridFooter />
    </div>
  );
}
