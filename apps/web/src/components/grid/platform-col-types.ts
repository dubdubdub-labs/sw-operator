import { db } from "@repo/db-client";
import type { ColTypeDef } from "ag-grid-enterprise";
import { DefaultCellEditor } from "./default-cell-editor";
import { DefaultCellRenderer, IdCellRenderer } from "./default-cell-renderer";
import { DefaultHeader, IdHeader } from "./default-header";
import type {
  EntityPageColDefContext,
  EntityPageGridContext,
} from "./entity-page-contexts";

export const PlatformColType = {
  default: "DEFAULT",
  entityItemId: "ENTITY_ITEM_ID",
} as const;

export type PlatformColType =
  (typeof PlatformColType)[keyof typeof PlatformColType];

export const platformColTypes = {
  [PlatformColType.default]: {
    width: 200,
    minWidth: 200,
    cellRenderer: DefaultCellRenderer,
    cellEditor: DefaultCellEditor,
    headerComponent: DefaultHeader,
    onCellValueChanged: (params) => {
      const gridContext = params.context as EntityPageGridContext;
      const colDefContext = params.colDef.context as EntityPageColDefContext;
      const rowId = params.node?.id;

      if (rowId && gridContext && colDefContext) {
        db.executeRegisteredMutation(
          db.registeredMutations.explorer.editCellValue,
          {
            entityName: gridContext.entityId,
            attrName: colDefContext.attr.name,
            entityItemId: rowId,
            value: params.newValue,
          }
        );
      }
    },
    editable: true,
  },
  [PlatformColType.entityItemId]: {
    cellRenderer: IdCellRenderer,
    headerComponent: IdHeader,
    editable: false,
  },
} as const satisfies Record<PlatformColType, ColTypeDef>;
