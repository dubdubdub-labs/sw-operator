import { cn } from "@repo/ui/lib/utils";

export function Window({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass3d relative max-h-96 min-h-24 w-128 min-w-32 max-w-128 flex-1 rounded-3xl p-3",
        className
      )}
    >
      {children}
    </div>
  );
}
