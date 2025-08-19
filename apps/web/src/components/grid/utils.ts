import {
  checkIsIdAttr,
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

export const getRowDataFromItemsRes = ({
  attrs,
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

    for (const [key, value] of Object.entries(rest)) {
      console.log("key", key);
      console.log("value", value);
      const attr = attrs.find((a) => a.name === key);
      const attrType = attr?.type;
      console.log("attrType", attrType);
      if (attrType === "ref") {
        console.log("value", value);
      } else if (attrType === "blob") {
        const checkedDataType = attr?.checkedDataType;
        console.log("checkedDataType", checkedDataType);
        const inferredTypes = attr?.inferredTypes;
        console.log("inferredTypes", inferredTypes);
      }
    }

    console.log("row", row);

    return {
      id,
      // ...rest,
    };
  });

  return cleanedData;
};
