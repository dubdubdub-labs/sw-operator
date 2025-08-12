import { Button } from "@repo/ui/components/button";
import type { CustomCellRendererProps } from "ag-grid-react";
import { toast } from "sonner";

export function DefaultCellRenderer(params: CustomCellRendererProps) {
  return (
    <div className="h-full w-full px-2 py-2 font-mono text-xs">
      {params.value}
    </div>
  );
}

export function IdCellRenderer(params: CustomCellRendererProps) {
  const idF4L4Label = `${params.value.slice(0, 4)}...${params.value.slice(-4)}`;

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(params.value);
    toast.success(`Copied id ${idF4L4Label} to clipboard`);
  };

  return (
    <div className="h-full w-full px-2 py-1 font-mono text-xs">
      <Button
        className="h-auto w-auto rounded-full px-2 py-1 text-xs"
        onClick={copyIdToClipboard}
        size="sm"
        variant="ghost"
      >
        {idF4L4Label}
      </Button>
    </div>
  );
}
