export default function WorkspaceLoading() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header skeleton */}
      <header className="bg-surface border-b border-slate-100 px-5 py-3 flex items-center gap-4 shrink-0">
        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel skeleton */}
        <div className="w-[340px] shrink-0 border-r border-slate-100 p-5 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-20 bg-slate-50 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        <div className="w-1 shrink-0 bg-slate-100" />

        {/* Centre panel skeleton */}
        <div className="flex-1 p-5 space-y-4">
          <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-72 bg-slate-50 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        </div>

        {/* Chat strip */}
        <div className="w-9 shrink-0 border-l border-slate-100 bg-slate-50" />
      </div>
    </div>
  );
}
