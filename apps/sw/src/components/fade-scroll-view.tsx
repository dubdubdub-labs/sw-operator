import type { ComponentProps } from "react";

interface FadeScrollViewProps extends ComponentProps<"div"> {
  fadeSize?: number;
}

export function FadeScrollView({
  children,
  fadeSize = 20,
  className = "",
  ...props
}: FadeScrollViewProps) {
  return (
    <div
      className={`overflow-y-auto ${className}`}
      style={{
        mask: `linear-gradient(to bottom, transparent 0%, black ${fadeSize}px, black calc(100% - ${fadeSize}px), transparent 100%)`,
        WebkitMask: `linear-gradient(to bottom, transparent 0%, black ${fadeSize}px, black calc(100% - ${fadeSize}px), transparent 100%)`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
