import type { ColDef } from "ag-grid-enterprise";

export const customColDefs = {
  "add-attr": {
    field: "add-attr",
    editable: false,
    initialFlex: 1,
  },
} as const satisfies Record<string, ColDef>;
