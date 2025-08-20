import {
  checkIsIdAttr,
  getDataType,
  type InstantUnknownSchemaDef,
  type InstaQLLifecycleState,
  type InstaQLParams,
  type SchemaAttr,
} from "@repo/sw-instantdb";
import type { ColDef } from "ag-grid-enterprise";
import type { EntityPageColDefContext } from "./entity-page-contexts";
import { PlatformColType } from "./platform-col-types";
import type { EntityRow } from "./types";

export const getColDefsFromAttrs = (attrs: SchemaAttr[]): ColDef[] => {
  return attrs.map((attr) => {
    const context: EntityPageColDefContext = {
      attr,
    };

    const isIdAttr = checkIsIdAttr(attr);
    const isLinkedEntity = attr.type === "ref";

    const dataType = getDataType({ attr });

    let colTypes: string[];
    if (isIdAttr) {
      colTypes = [PlatformColType.default, PlatformColType.entityItemId];
    } else if (isLinkedEntity) {
      colTypes = [PlatformColType.default, PlatformColType.linkedEntity];
    } else if (dataType === "string") {
      colTypes = [PlatformColType.default, PlatformColType.text];
    } else if (dataType === "number") {
      colTypes = [PlatformColType.default, PlatformColType.number];
    } else {
      colTypes = [PlatformColType.default];
    }

    return {
      field: attr.name,
      headerName: attr.name,
      width: 100,
      context,
      cellDataType: dataType,
      editable: !(isIdAttr || isLinkedEntity),
      type: colTypes,
    };
  });
};

export const getRowDataFromItemsRes = ({
  itemsRes,
  entityId,
}: {
  attrs: SchemaAttr[];
  itemsRes: InstaQLLifecycleState<
    InstantUnknownSchemaDef,
    InstaQLParams<InstantUnknownSchemaDef>,
    true
  >;
  entityId: string;
}): EntityRow[] => {
  const data = itemsRes.data;
  if (data === undefined) {
    console.log("data is undefined");
    return [];
  }

  const entityData = data[entityId];

  if (entityData === undefined) {
    console.log("entityData is undefined");
    return [];
  }

  const cleanedData = entityData.map((row) => {
    const { id, ...rest } = row;
    const rowData: EntityRow = { id };

    for (const [key, value] of Object.entries(rest)) {
      rowData[key] = value;
    }

    return rowData;
  });

  return cleanedData;
};
