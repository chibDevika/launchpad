export default function TrackerLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
              L
            </div>
            <span className="font-semibold text-text-primary">Launchpad</span>
          </div>
          <div className="h-9 w-36 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-4 min-w-max">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="w-64 shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((card) => (
                  <div
                    key={card}
                    className="card p-3.5 space-y-2.5 animate-pulse"
                  >
                    <div className="space-y-1.5">
                      <div className="h-4 w-3/4 bg-slate-100 rounded" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 bg-slate-100 rounded-full" />
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <div className="h-5 w-16 bg-slate-100 rounded-full" />
                      <div className="h-5 w-10 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
