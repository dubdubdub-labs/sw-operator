import type { ColDef } from "ag-grid-enterprise";

export const rowSelectionColDef: ColDef = {
  cellStyle: {
    paddingLeft: 7,
  },
  headerStyle: {
    paddingLeft: 7,
  },
  pinned: "left",
  lockPinned: true,
  width: 33,
};
