export function WindowToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass3d -translate-x-1/2 absolute top-3 left-1/2 z-20 flex h-10 items-center justify-center rounded-full p-3 backdrop-blur-xs">
      {children}
    </div>
  );
}
