import { Button } from "@repo/ui/components/button";
import type { CustomCellRendererProps } from "ag-grid-react";
import { toast } from "sonner";

export function DefaultCellRenderer(params: CustomCellRendererProps) {
  let displayValue = params.value;

  if (params.value === null || params.value === undefined) {
    displayValue = "";
  } else if (typeof params.value === "object") {
    displayValue = JSON.stringify(params.value);
  } else if (typeof params.value === "boolean") {
    displayValue = params.value.toString();
  }

  return (
    <div className="h-full w-full px-2 py-2 font-mono text-xs">
      {displayValue}
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

export function LinkedEntityCellRenderer(params: CustomCellRendererProps) {
  if (!params.value) {
    return <div className="h-full w-full px-2 py-2 font-mono text-xs" />;
  }

  const linkedEntities = Array.isArray(params.value) ? params.value : [];

  if (linkedEntities.length === 0) {
    return <div className="h-full w-full px-2 py-2 font-mono text-xs" />;
  }

  const ids = linkedEntities
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 1) {
    const id = ids[0];
    const idF4L4Label = `${id?.slice(0, 4)}...${id?.slice(-4)}`;

    const copyIdToClipboard = () => {
      navigator.clipboard.writeText(id ?? "");
      toast.success(`Copied linked id ${idF4L4Label} to clipboard`);
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

  return (
    <div className="flex h-full w-full items-center gap-1 px-2 py-1 font-mono text-xs">
      {ids.slice(0, 2).map((id) => {
        const idF4L4Label = `${id.slice(0, 4)}...${id.slice(-4)}`;
        return (
          <Button
            className="h-auto w-auto rounded-full px-2 py-1 text-xs"
            key={id}
            onClick={() => {
              navigator.clipboard.writeText(id);
              toast.success(`Copied linked id ${idF4L4Label} to clipboard`);
            }}
            size="sm"
            variant="ghost"
          >
            {idF4L4Label}
          </Button>
        );
      })}
      {ids.length > 2 && (
        <span className="text-muted-foreground">+{ids.length - 2} more</span>
      )}
    </div>
  );
}
