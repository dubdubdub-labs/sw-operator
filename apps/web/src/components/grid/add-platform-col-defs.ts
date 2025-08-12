import type { ColDef } from "ag-grid-enterprise";
import { customColDefs } from "./platform-col-defs";

export const addPlatformColDefs = ({
  appColDefs,
}: {
  appColDefs: ColDef[];
}) => {
  return [...appColDefs, customColDefs["add-attr"]];
};
