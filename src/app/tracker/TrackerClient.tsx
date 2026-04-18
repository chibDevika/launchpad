"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import type { Application, UserStatusBucket } from "@/lib/types";

interface Props {
  applications: Application[];
  buckets: UserStatusBucket[];
}

const CHANNEL_OPTIONS = [
  "LinkedIn",
  "Referral",
  "Company site",
  "Recruiter",
  "Other",
];

// ── localStorage helpers ────────────────────────────────────────────────────

function readCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("lp_collapsed_cols");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeCollapsed(cols: Set<string>) {
  localStorage.setItem("lp_collapsed_cols", JSON.stringify(Array.from(cols)));
}

function readScrollHinted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("lp_scroll_hinted") === "1";
}

// ── Quick-add modal ─────────────────────────────────────────────────────────

interface QuickAddForm {
  company_name: string;
  role_title: string;
  channel: string;
  tags: string;
  status: string;
}

function QuickAddModal({
  buckets,
  onClose,
  onAdded,
}: {
  buckets: UserStatusBucket[];
  onClose: () => void;
  onAdded: (app: Application) => void;
}) {
  const [form, setForm] = useState<QuickAddForm>({
    company_name: "",
    role_title: "",
    channel: "",
    tags: "",
    status: buckets[0]?.name ?? "Saved",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim() && !form.role_title.trim()) {
      setError("Enter at least a company name or role title.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const channels = form.channel ? [form.channel] : [];

    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        company_name: form.company_name.trim() || null,
        role_title: form.role_title.trim() || null,
        status: form.status,
        channels,
        custom_tags: tags,
        applied_via_referral: false,
        reached_out_to_hm: false,
      })
      .select()
      .single();

    setSaving(false);
    if (err || !data) {
      setError("Something went wrong. Try again.");
      return;
    }
    onAdded(data as Application);
    onClose();
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Quick add</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">
                Company
              </label>
              <input
                className="input text-sm"
                placeholder="Acme Corp"
                value={form.company_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">
                Role title
              </label>
              <input
                className="input text-sm"
                placeholder="Software Engineer"
                value={form.role_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role_title: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">
              Channel
            </label>
            <select
              className="input text-sm"
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({ ...f, channel: e.target.value }))
              }
            >
              <option value="">— None —</option>
              {CHANNEL_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">
              Status
            </label>
            <select
              className="input text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">
              Tags{" "}
              <span className="font-normal text-slate-400">
                (comma-separated)
              </span>
            </label>
            <input
              className="input text-sm"
              placeholder="Dream company, Referral, Stretch"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-[0.38]"
            >
              {saving ? "Adding…" : "Add application"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TrackerClient ────────────────────────────────────────────────────────────

export default function TrackerClient({
  applications: initial,
  buckets,
}: Props) {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>(initial);
  const [navigating, setNavigating] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeApp = activeId
    ? (apps.find((a) => a.id === activeId) ?? null)
    : null;

  // Collapsed columns
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);

  // Scroll affordance
  const boardRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Filters
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterChannel, setFilterChannel] = useState<string>("");

  useEffect(() => {
    if (!boardRef.current) return;
    const el = boardRef.current;
    const overflows = el.scrollWidth > el.clientWidth;
    if (overflows && !readScrollHinted()) {
      setShowScrollHint(true);
    }
    function onScroll() {
      setShowScrollHint(false);
      localStorage.setItem("lp_scroll_hinted", "1");
    }
    el.addEventListener("scroll", onScroll, { once: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [apps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function navigate(path: string, key: string) {
    setNavigating(key);
    router.push(path);
  }

  function toggleCollapsed(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      writeCollapsed(next);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const draggedId = String(active.id);
    const targetStatus = String(over.id);
    const draggedApp = apps.find((a) => a.id === draggedId);
    if (!draggedApp || draggedApp.status === targetStatus) return;

    // Optimistic update
    setApps((prev) =>
      prev.map((a) =>
        a.id === draggedId ? { ...a, status: targetStatus } : a,
      ),
    );

    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq("id", draggedId);
  }

  // Derived: filtered apps
  const allTags = Array.from(
    new Set(apps.flatMap((a) => a.custom_tags)),
  ).sort();
  const allChannels = Array.from(
    new Set(apps.flatMap((a) => a.channels)),
  ).sort();

  const filteredApps = apps.filter((a) => {
    if (filterChannel && !a.channels.includes(filterChannel)) return false;
    if (
      filterTags.length > 0 &&
      !filterTags.every((t) => a.custom_tags.includes(t))
    )
      return false;
    return true;
  });

  const filtersActive = filterChannel !== "" || filterTags.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
              L
            </div>
            <span className="font-semibold text-text-primary">Launchpad</span>
          </Link>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard", "dashboard")}
              disabled={navigating !== null}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {navigating === "dashboard" ? "Loading…" : "Dashboard"}
            </button>
            <button
              onClick={() => navigate("/profile", "profile")}
              disabled={navigating !== null}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {navigating === "profile" ? "Loading…" : "Profile"}
            </button>
            <button
              onClick={async () => {
                setNavigating("signout");
                await createClient().auth.signOut();
                router.push("/login");
              }}
              disabled={navigating !== null}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {navigating === "signout" ? "Signing out…" : "Sign out"}
            </button>
            <button
              onClick={() => setShowQuickAdd(true)}
              disabled={navigating !== null}
              className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-70"
            >
              <span className="text-base leading-none">+</span> New application
            </button>
          </nav>
        </div>
      </header>

      {/* Filter bar */}
      {apps.length > 0 && (allTags.length > 0 || allChannels.length > 0) && (
        <div className="bg-surface border-b border-slate-100 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-text-secondary shrink-0">
              Filter:
            </span>

            {/* Channel filter */}
            {allChannels.length > 0 && (
              <select
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-background text-text-primary focus:outline-none focus:ring-[3px] focus:ring-[#EEF2FF] focus:border-[#6366F1]"
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
              >
                <option value="">All channels</option>
                {allChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            )}

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setFilterTags((prev) =>
                        prev.includes(tag)
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag],
                      )
                    }
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filterTags.includes(tag)
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-text-secondary border-slate-200 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {filtersActive && (
              <button
                onClick={() => {
                  setFilterTags([]);
                  setFilterChannel("");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {apps.length === 0 ? (
          <EmptyState onStart={() => setShowQuickAdd(true)} />
        ) : (
          <div className="relative">
            {/* Right-edge fade gradient scroll hint */}
            {showScrollHint && (
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none flex items-center justify-end pr-2">
                <span className="text-slate-400 text-lg select-none animate-pulse">
                  ›
                </span>
              </div>
            )}
            {/* Board */}
            <div
              ref={boardRef}
              className="overflow-x-scroll pb-4"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#CBD5E1 transparent",
              }}
            >
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 min-w-max">
                  {buckets.map((bucket) => {
                    const cards = filteredApps.filter(
                      (a) => a.status === bucket.name,
                    );
                    const isCollapsed = collapsed.has(bucket.name);
                    return (
                      <Column
                        key={bucket.id}
                        bucket={bucket}
                        cards={cards}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => toggleCollapsed(bucket.name)}
                        navigatingId={navigating}
                        activeId={activeId}
                        onCardClick={(id) =>
                          navigate(`/applications/${id}`, id)
                        }
                      />
                    );
                  })}
                </div>

                <DragOverlay>
                  {activeApp ? <DragCard app={activeApp} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}
      </main>

      {showQuickAdd && (
        <QuickAddModal
          buckets={buckets}
          onClose={() => setShowQuickAdd(false)}
          onAdded={(app) => setApps((prev) => [app, ...prev])}
        />
      )}
    </div>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────

function Column({
  bucket,
  cards,
  isCollapsed,
  onToggleCollapse,
  onCardClick,
  navigatingId,
  activeId,
}: {
  bucket: UserStatusBucket;
  cards: Application[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCardClick: (id: string) => void;
  navigatingId: string | null;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.name });

  if (isCollapsed) {
    return (
      <div className="w-12 shrink-0 flex flex-col items-center gap-2 pt-1">
        <button
          onClick={onToggleCollapse}
          className="flex flex-col items-center gap-1.5 group"
          title={`Expand ${bucket.name}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: bucket.color }}
          />
          <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors [writing-mode:vertical-lr] rotate-180">
            {bucket.name}
          </span>
          {cards.length > 0 && (
            <span className="text-[10px] text-text-secondary bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {cards.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 space-y-3">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: bucket.color }}
        />
        <span className="text-sm font-semibold text-text-primary flex-1">
          {bucket.name}
        </span>
        <span className="text-xs text-text-secondary">
          {cards.length || ""}
        </span>
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 transition-colors ml-0.5"
          title="Collapse column"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[80px] rounded-xl transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
        }`}
      >
        {cards.map((app) => (
          <DraggableCard
            key={app.id}
            app={app}
            onClick={onCardClick}
            isNavigating={navigatingId === app.id}
            disabled={navigatingId !== null}
            isDragging={activeId === app.id}
          />
        ))}
        {cards.length === 0 && activeId === null && (
          <div className="border-2 border-dashed border-slate-100 rounded-card p-4 text-center text-xs text-slate-400">
            None
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draggable Card ────────────────────────────────────────────────────────────

function DraggableCard({
  app,
  onClick,
  isNavigating,
  disabled,
  isDragging,
}: {
  app: Application;
  onClick: (id: string) => void;
  isNavigating: boolean;
  disabled: boolean;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: app.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-30" : ""}`}
    >
      <div className="relative group">
        {/* Drag handle */}
        <div
          {...listeners}
          {...attributes}
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 rounded-l-card"
          title="Drag to move"
        >
          <svg
            className="w-3 h-3 text-slate-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="9" cy="7" r="1.5" />
            <circle cx="15" cy="7" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="17" r="1.5" />
            <circle cx="15" cy="17" r="1.5" />
          </svg>
        </div>
        <button
          onClick={() => onClick(app.id)}
          disabled={disabled}
          className={`card p-3.5 text-left w-full hover:shadow-md transition-all space-y-2.5 pl-5 ${
            isNavigating ? "opacity-70 ring-2 ring-primary/30" : ""
          }`}
        >
          <CardContent app={app} />
        </button>
      </div>
    </div>
  );
}

// Drag overlay card (floating copy during drag)
function DragCard({ app }: { app: Application }) {
  return (
    <div className="card p-3.5 text-left w-64 shadow-xl space-y-2.5 rotate-1 opacity-95 cursor-grabbing">
      <CardContent app={app} />
    </div>
  );
}

function CardContent({ app }: { app: Application }) {
  return (
    <>
      <div className="space-y-0.5">
        <p className="font-semibold text-text-primary text-sm leading-snug">
          {app.company_name ?? "Company TBD"}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {app.role_title ?? "Role TBD"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {app.channels?.map((ch) => (
          <span
            key={ch}
            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
          >
            {ch}
          </span>
        ))}
        {app.custom_tags?.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        {app.match_score !== null ? (
          <MatchBadge score={app.match_score} />
        ) : (
          <span className="text-xs text-slate-400">No JD yet</span>
        )}
        <StaleBadge updatedAt={app.updated_at} status={app.status} />
      </div>
    </>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const style =
    score >= 70
      ? "bg-emerald-50 text-emerald-700"
      : "bg-[#FAEEDA] text-[#854F0B]";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style}`}>
      {score}% match
    </span>
  );
}

const TERMINAL_STAGES = new Set(["Rejected", "Ghosted", "Withdrawn"]);

function StaleBadge({
  updatedAt,
  status,
}: {
  updatedAt: string;
  status: string;
}) {
  if (TERMINAL_STAGES.has(status)) return null;

  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let label: string;
  if (diffDays === 0) {
    label = diffHours === 0 ? "today" : `${diffHours}h ago`;
  } else {
    label = `${diffDays}d ago`;
  }

  const colorClass =
    diffDays >= 14
      ? "bg-red-50 text-red-500"
      : diffDays >= 7
        ? "bg-amber-50 text-amber-600"
        : "bg-slate-100 text-slate-400";

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="card p-12 text-center space-y-4 max-w-md mx-auto mt-16">
      <p className="font-semibold text-text-primary text-lg">
        Your tracker is empty.
      </p>
      <p className="text-sm text-text-secondary">
        Add your first application to start tracking your job search.
      </p>
      <button onClick={onStart} className="btn-primary mx-auto">
        Add an application →
      </button>
    </div>
  );
}
