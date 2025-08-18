export function WindowToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass3d absolute inset-x-3 top-3 z-20 flex h-10 items-center justify-center rounded-full">
      {children}
    </div>
  );
}
