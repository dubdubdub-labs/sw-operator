import { Input } from "@repo/ui/components/input";
import type { CustomCellEditorProps } from "ag-grid-react";

export function DefaultCellEditor(props: CustomCellEditorProps) {
  const handleBlur = () => {
    props.stopEditing();
  };

  return (
    <Input
      autoFocus
      className="h-full rounded-none border-none px-2 pt-1.5 font-mono text-xs focus-visible:ring-0 md:text-xs"
      onBlur={handleBlur}
      onChange={(e) => props.onValueChange(e.target.value)}
      type="text"
      value={props.value}
    />
  );
}
