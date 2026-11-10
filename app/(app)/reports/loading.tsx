export default function Loading() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true">
      <div className="h-7 w-1/2 rounded-lg bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
      <div className="h-16 rounded-2xl bg-slate-200" />
      <div className="h-16 rounded-2xl bg-slate-200" />
    </div>
  );
}
