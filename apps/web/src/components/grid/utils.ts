import type { SchemaAttr } from "@repo/db-client";
import { checkIsIdAttr } from "@repo/db-client/utils";
import type { ColDef } from "ag-grid-enterprise";
import type { EntityPageColDefContext } from "./entity-page-contexts";
import { PlatformColType } from "./platform-col-types";

export const getColDefsFromAttrs = (attrs: SchemaAttr[]): ColDef[] => {
  return attrs.map((attr) => {
    const context: EntityPageColDefContext = {
      attr,
    };

    const isIdAttr = checkIsIdAttr(attr);

    return {
      field: attr.name,
      headerName: attr.name,
      width: 100,
      context,
      editable: !isIdAttr,
      type: isIdAttr
        ? [PlatformColType.default, PlatformColType.entityItemId]
        : [PlatformColType.default],
    };
  });
};
