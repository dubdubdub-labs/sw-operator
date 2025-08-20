import { dangerousUnsafeDb } from "@repo/db-core/client";
import { useCurrentNamespace } from "@repo/hooks";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { type RowsPerPage, useExplorerStore } from "@/stores/explorer-store";

export function GridFooter() {
  const pathname = usePathname();
  const entityId = pathname.split("/").pop();
  const { allCount } = useCurrentNamespace({
    db: dangerousUnsafeDb,
    entityId: entityId ?? "",
  });

  const { getCurrentPage, getRowsPerPage, setCurrentPage, setRowsPerPage } =
    useExplorerStore();

  const currentPage = getCurrentPage(entityId ?? "");
  const rowsPerPage = getRowsPerPage(entityId ?? "");

  const totalPages = useMemo(() => {
    return Math.ceil((allCount ?? 0) / rowsPerPage);
  }, [allCount, rowsPerPage]);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const handlePreviousPage = () => {
    if (canGoPrevious && entityId) {
      setCurrentPage(entityId, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext && entityId) {
      setCurrentPage(entityId, currentPage + 1);
    }
  };

  const handleRowsPerPageChange = (rows: RowsPerPage) => {
    if (entityId) {
      setRowsPerPage(entityId, rows);
    }
  };

  const startItem = currentPage * rowsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * rowsPerPage, allCount ?? 0);

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t px-2 text-xs">
      <div className="flex items-center gap-2">
        <Button
          className="h-5 w-6 rounded-[0.25rem] p-0"
          disabled={!canGoPrevious}
          onClick={handlePreviousPage}
          size="sm"
          variant="outline"
        >
          <ArrowLeftIcon className="size-3.5" />
        </Button>

        <Button
          className="h-5 w-6 rounded-[0.25rem] p-0"
          disabled={!canGoNext}
          onClick={handleNextPage}
          size="sm"
          variant="outline"
        >
          <ArrowRightIcon className="size-3.5" />
        </Button>

        <span className="text-muted-foreground">
          Page {currentPage + 1} of {totalPages || 1}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">
          {allCount
            ? `${startItem}-${endItem} of ${allCount} items`
            : "0 items"}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-5 gap-1 px-2 text-xs"
              size="sm"
              variant="outline"
            >
              {rowsPerPage} rows
              <ChevronDownIcon className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRowsPerPageChange(100)}>
              100 rows
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRowsPerPageChange(500)}>
              500 rows
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRowsPerPageChange(1000)}>
              1000 rows
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
