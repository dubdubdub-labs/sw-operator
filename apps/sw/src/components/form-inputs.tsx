import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";

export function GlassInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-8 rounded-full border-none bg-white/50 shadow-none",
        className
      )}
    />
  );
}

export function GlassTextarea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn(
        "rounded-[16px] border-none bg-white/50 shadow-none",
        className
      )}
    />
  );
}

export function GlassForm({
  ...props
}: React.ComponentProps<typeof Form> & {}) {
  return <Form {...props} />;
}

export function GlassFormField({
  ...props
}: React.ComponentProps<typeof FormField> & {}) {
  return <FormField {...props} />;
}

export function GlassFormItem({
  ...props
}: React.ComponentProps<typeof FormItem> & {}) {
  return (
    <FormItem {...props} className="gap-1">
      {props.children}
    </FormItem>
  );
}

export function GlassFormLabel({
  ...props
}: React.ComponentProps<typeof FormLabel> & {}) {
  return (
    <FormLabel {...props} className="px-2 text-sm">
      {props.children}
    </FormLabel>
  );
}

export function GlassFormControl({
  ...props
}: React.ComponentProps<typeof FormControl> & {}) {
  return (
    <FormControl {...props} className="text-sm">
      {props.children}
    </FormControl>
  );
}

export function GlassFormDescription({
  ...props
}: React.ComponentProps<typeof FormDescription> & {}) {
  return (
    <FormDescription {...props} className="px-2 text-sm">
      {props.children}
    </FormDescription>
  );
}

export function GlassFormMessage({
  ...props
}: React.ComponentProps<typeof FormMessage> & {}) {
  return (
    <FormMessage {...props} className="px-2 text-sm">
      {props.children}
    </FormMessage>
  );
}
