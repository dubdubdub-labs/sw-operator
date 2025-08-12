import {
  AllEnterpriseModule,
  type ColDef,
  LicenseManager,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { addPlatformColDefs } from "./add-platform-col-defs";
import { defaultColDef } from "./default-col-def";
import { gridTheme } from "./grid-theme";
import { platformColTypes } from "./platform-col-types";
import { rowSelectionColDef } from "./row-selection-col-def";

LicenseManager.setLicenseKey(
  "[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-090576}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 August 2025}____[v3]_[0102]_MTc1NjU5NDgwMDAwMA==055771d37eabf862ce4b35dbb0d2a1df"
);

export function Grid<T, C>({
  rowData,
  colDefs: appColDefs,
  context,
}: {
  rowData: T[];
  colDefs: ColDef<T>[];
  context: C;
}) {
  const colDefs = addPlatformColDefs({ appColDefs });
  return (
    <AgGridReact
      className="flex-1"
      columnDefs={colDefs}
      columnTypes={platformColTypes}
      context={context}
      defaultColDef={defaultColDef}
      getRowId={(params) => params.data.id}
      modules={[AllEnterpriseModule]}
      rowData={rowData}
      rowSelection={{ mode: "multiRow" }}
      selectionColumnDef={rowSelectionColDef}
      singleClickEdit={true}
      suppressDragLeaveHidesColumns={true}
      theme={gridTheme}
    />
  );
}
