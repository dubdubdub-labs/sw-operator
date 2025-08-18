import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";

export function FormInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "rounded-full border-none bg-white/50 shadow-none",
        className
      )}
    />
  );
}

export function FormTextarea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn(
        "rounded-lg border-none bg-white/50 shadow-none",
        className
      )}
    />
  );
}
