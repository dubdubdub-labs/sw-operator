import {
  checkIsIdAttr,
  checkIsIndexedAttr,
  checkIsRequiredAttr,
  checkIsUniqAttr,
} from "@repo/db-client/utils";
import type { CustomHeaderProps } from "ag-grid-react";
import { AsteriskIcon, SearchIcon, SignatureIcon } from "lucide-react";
import type { EntityPageColDefContext } from "./entity-page-contexts";

export function DefaultHeader(params: CustomHeaderProps) {
  // const gridContext = params.context as EntityPageGridContext;
  const colDef = params.column.getColDef();
  const colDefContext = colDef.context as EntityPageColDefContext;

  const isIndexedAttr =
    colDefContext?.attr && checkIsIndexedAttr(colDefContext.attr);
  const isUniqAttr = colDefContext?.attr && checkIsUniqAttr(colDefContext.attr);
  const isRequiredAttr =
    colDefContext?.attr && checkIsRequiredAttr(colDefContext.attr);

  return (
    <div className="flex h-full w-full items-center justify-between gap-1 px-2 py-2 font-mono text-xs">
      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
        {params.displayName}
      </span>
      <div className="flex shrink-0 items-center gap-1 rounded-md bg-background px-1 py-1 [&>svg]:size-3">
        {isIndexedAttr && <SearchIcon />}
        {isUniqAttr && <SignatureIcon />}
        {isRequiredAttr && <AsteriskIcon />}
      </div>
    </div>
  );
}

export function IdHeader(params: CustomHeaderProps) {
  const colDef = params.column.getColDef();
  const colDefContext = colDef.context as EntityPageColDefContext;
  const isIdAttr = colDefContext?.attr && checkIsIdAttr(colDefContext.attr);

  if (!isIdAttr) {
    return null;
  }

  return (
    <div className="flex h-full items-center gap-1 px-2 py-2 text-xs">ID</div>
  );
}
