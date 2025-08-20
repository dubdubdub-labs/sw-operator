import { Input } from "@repo/ui/components/input";
import type { CustomCellEditorProps } from "ag-grid-react";

const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;

export function DefaultCellEditor(props: CustomCellEditorProps) {
  const handleBlur = () => {
    props.stopEditing();
  };

  let initialValue = "";
  if (props.value !== null && props.value !== undefined) {
    if (typeof props.value === "object") {
      initialValue = JSON.stringify(props.value);
    } else {
      initialValue = String(props.value);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Try to parse as JSON if it looks like JSON
    if (newValue.startsWith("{") || newValue.startsWith("[")) {
      try {
        const parsed = JSON.parse(newValue);
        props.onValueChange(parsed);
        return;
      } catch {
        // If parsing fails, treat as string
      }
    }

    // Try to parse as number if it looks like a number
    if (NUMBER_REGEX.test(newValue)) {
      const num = Number(newValue);
      if (!Number.isNaN(num)) {
        props.onValueChange(num);
        return;
      }
    }

    // Try to parse as boolean
    if (newValue === "true") {
      props.onValueChange(true);
      return;
    }
    if (newValue === "false") {
      props.onValueChange(false);
      return;
    }

    // Default to string
    props.onValueChange(newValue);
  };

  return (
    <Input
      autoFocus
      className="h-full rounded-none border-none px-2 pt-1.5 font-mono text-xs focus-visible:ring-0 md:text-xs"
      defaultValue={initialValue}
      onBlur={handleBlur}
      onChange={handleChange}
      type="text"
    />
  );
}

export function TextCellEditor(props: CustomCellEditorProps) {
  const handleBlur = () => {
    props.stopEditing();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    props.onValueChange(newValue);
  };

  return (
    <Input
      autoFocus
      className="h-full rounded-none border-none px-2 pt-1.5 font-mono text-xs focus-visible:ring-0 md:text-xs"
      defaultValue={props.value}
      onBlur={handleBlur}
      onChange={handleChange}
      type="text"
    />
  );
}

export function NumberCellEditor(props: CustomCellEditorProps) {
  const handleBlur = () => {
    props.stopEditing();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    props.onValueChange(newValue);
  };

  return (
    <Input
      autoFocus
      className="h-full rounded-none border-none px-2 pt-1.5 font-mono text-xs focus-visible:ring-0 md:text-xs"
      defaultValue={props.value}
      onBlur={handleBlur}
      onChange={handleChange}
      type="number"
    />
  );
}
