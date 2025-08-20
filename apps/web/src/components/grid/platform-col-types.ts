import { dangerousUnsafeDb, db } from "@repo/db-core/client";
import type { ColTypeDef } from "ag-grid-enterprise";
import {
  DefaultCellEditor,
  NumberCellEditor,
  TextCellEditor,
} from "./default-cell-editor";
import {
  DefaultCellRenderer,
  IdCellRenderer,
  LinkedEntityCellRenderer,
} from "./default-cell-renderer";
import { DefaultHeader, IdHeader } from "./default-header";
import type {
  EntityPageColDefContext,
  EntityPageGridContext,
} from "./entity-page-contexts";

export const PlatformColType = {
  default: "DEFAULT",
  entityItemId: "ENTITY_ITEM_ID",
  linkedEntity: "LINKED_ENTITY",
  text: "TEXT",
  number: "NUMBER",
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
        dangerousUnsafeDb.executeRegisteredMutation(
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
  [PlatformColType.linkedEntity]: {
    cellRenderer: LinkedEntityCellRenderer,
    headerComponent: DefaultHeader,
    editable: false,
  },
  [PlatformColType.text]: {
    cellEditor: TextCellEditor,
  },
  [PlatformColType.number]: {
    cellEditor: NumberCellEditor,
  },
} as const satisfies Record<PlatformColType, ColTypeDef>;
