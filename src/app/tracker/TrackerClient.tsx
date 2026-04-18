"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Application, UserStatusBucket } from "@/lib/types";

interface Props {
  applications: Application[];
  buckets: UserStatusBucket[];
}

export default function TrackerClient({ applications, buckets }: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  function navigate(path: string, key: string) {
    setNavigating(key);
    router.push(path);
  }

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
              onClick={() => navigate("/applications/new", "new")}
              disabled={navigating !== null}
              className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-70"
            >
              {navigating === "new" ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <span className="text-base leading-none">+</span> New
                  application
                </>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {applications.length === 0 ? (
          <EmptyState onStart={() => navigate("/applications/new", "new")} />
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {buckets.map((bucket) => {
                const cards = applications.filter(
                  (a) => a.status === bucket.name,
                );
                return (
                  <Column
                    key={bucket.id}
                    bucket={bucket}
                    cards={cards}
                    navigatingId={navigating}
                    onCardClick={(id) => navigate(`/applications/${id}`, id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Column({
  bucket,
  cards,
  onCardClick,
  navigatingId,
}: {
  bucket: UserStatusBucket;
  cards: Application[];
  onCardClick: (id: string) => void;
  navigatingId: string | null;
}) {
  return (
    <div className="w-64 shrink-0 space-y-3">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: bucket.color }}
        />
        <span className="text-sm font-semibold text-text-primary">
          {bucket.name}
        </span>
        <span className="text-xs text-text-secondary ml-auto">
          {cards.length || ""}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {cards.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            onClick={onCardClick}
            isNavigating={navigatingId === app.id}
            disabled={navigatingId !== null}
          />
        ))}
        {cards.length === 0 && (
          <div className="border-2 border-dashed border-slate-100 rounded-card p-4 text-center text-xs text-slate-400">
            None
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  onClick,
  isNavigating,
  disabled,
}: {
  app: Application;
  onClick: (id: string) => void;
  isNavigating: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => onClick(app.id)}
      disabled={disabled}
      className={`card p-3.5 text-left w-full hover:shadow-md transition-all space-y-2.5 ${isNavigating ? "opacity-70 ring-2 ring-primary/30" : ""}`}
    >
      {/* Company + role */}
      <div className="space-y-0.5">
        <p className="font-semibold text-text-primary text-sm leading-snug">
          {app.company_name ?? "Company TBD"}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {app.role_title ?? "Role TBD"}
        </p>
      </div>

      {/* Tags row */}
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

      {/* Footer: match score + staleness */}
      <div className="flex items-center justify-between pt-0.5">
        {app.match_score !== null ? (
          <MatchBadge score={app.match_score} />
        ) : (
          <span className="text-xs text-slate-400">No JD yet</span>
        )}
        <StaleBadge updatedAt={app.updated_at} status={app.status} />
      </div>
    </button>
  );
}

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
