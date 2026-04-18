export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
              L
            </div>
            <span className="font-semibold text-text-primary">Launchpad</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-1">
          <div className="h-9 w-72 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-12 w-52 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-3 animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  <div className="h-3 w-12 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
