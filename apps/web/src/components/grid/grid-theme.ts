import { themeQuartz } from "ag-grid-enterprise";

export const gridTheme = themeQuartz.withParams({
  headerHeight: 33,
  rowHeight: 33,
  columnBorder: "1px solid var(--border)",
  headerColumnResizeHandleColor: "transparent",
  headerColumnBorder: "1px solid var(--border)",
  cellHorizontalPadding: 0,
  cellEditingBorder: "1px solid var(--primary)",
  borderRadius: 0,
  cellEditingShadow: "none",
  selectCellBorder: "none",
  rangeSelectionBorderStyle: "solid",
  rangeSelectionBorderColor: "transparent",
  wrapperBorder: "none",
  wrapperBorderRadius: 0,
  checkboxBorderRadius: 4,
});
