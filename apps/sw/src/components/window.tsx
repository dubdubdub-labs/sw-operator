export function Window({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass3d relative max-h-96 min-h-24 w-128 min-w-32 max-w-128 flex-1 rounded-3xl p-3">
      {children}
    </div>
  );
}
