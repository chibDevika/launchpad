"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, Application } from "@/lib/types";

interface Props {
  profile: UserProfile;
  applications: Application[];
}

const STATUS_STYLE: Record<string, string> = {
  Saved: "bg-[#F3F4F6] text-[#6B7280]",
  Applied: "bg-[#EEF2FF] text-[#4338CA]",
  "Phone Screen": "bg-[#FAEEDA] text-[#854F0B]",
  Interview: "bg-[#FAEEDA] text-[#854F0B]",
  Offer: "bg-[#ECFDF5] text-[#065F46]",
  Rejected: "bg-[#F3F4F6] text-[#9CA3AF]",
  Withdrawn: "bg-[#F3F4F6] text-[#9CA3AF]",
};

function matchScoreStyle(score: number) {
  if (score >= 70) return "bg-emerald-50 text-emerald-700";
  return "bg-[#FAEEDA] text-[#854F0B]";
}

function firstName(fullName: string | null) {
  if (!fullName) return "there";
  return fullName.split(" ")[0];
}

export default function DashboardClient({ profile, applications }: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);

  function navigate(path: string, key: string) {
    setNavigating(key);
    router.push(path);
  }

  const rejected = applications.filter(
    (a) => a.status === "Rejected" || a.status === "Withdrawn",
  );
  const active = applications.filter(
    (a) => a.status !== "Rejected" && a.status !== "Withdrawn",
  );

  const isDraft = (a: Application) => !a.company_name && !a.role_title;
  const drafts = active.filter(isDraft);
  const nonDrafts = active.filter((a) => !isDraft(a));
  const displayedActive = showDrafts ? active : nonDrafts;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
              L
            </div>
            <span className="font-semibold text-text-primary">Launchpad</span>
          </div>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate("/tracker", "tracker")}
              disabled={navigating !== null}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {navigating === "tracker" ? "Loading…" : "Tracker"}
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
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary">
            Hey {firstName(profile.full_name)}, good to have you back.
          </h1>
          <p className="text-text-secondary">
            {active.length === 0
              ? "No active applications yet — start one below."
              : `You have ${active.length} application${active.length > 1 ? "s" : ""} on the go. Here's where things stand.`}
          </p>
        </div>

        {/* New application CTA */}
        <button
          onClick={() => navigate("/applications/new", "new")}
          disabled={navigating !== null}
          className="btn-primary flex items-center gap-2 text-base py-3 px-6 disabled:opacity-[0.38]"
        >
          {navigating === "new" ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <span className="text-lg leading-none">+</span>
              Start a new application
            </>
          )}
        </button>

        {/* Active applications */}
        {active.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-label">Active applications</h2>
              {drafts.length > 0 && (
                <button
                  onClick={() => setShowDrafts((v) => !v)}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showDrafts
                    ? "Hide drafts"
                    : `Show drafts (${drafts.length})`}
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedActive.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  isNavigating={navigating === app.id}
                  disabled={navigating !== null}
                  onClick={() => navigate(`/applications/${app.id}`, app.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState onStart={() => navigate("/applications/new", "new")} />
        )}

        {/* Rejected (collapsed) */}
        {rejected.length > 0 && (
          <section className="space-y-4">
            <h2 className="section-label">Archived</h2>
            <div className="grid gap-4 sm:grid-cols-2 opacity-60">
              {rejected.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  isNavigating={navigating === app.id}
                  disabled={navigating !== null}
                  onClick={() => navigate(`/applications/${app.id}`, app.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
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
  onClick: () => void;
  isNavigating: boolean;
  disabled: boolean;
}) {
  const draft = !app.company_name && !app.role_title;
  const date = new Date(app.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`card p-5 text-left transition-all duration-150 space-y-3 w-full
        hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-px
        ${isNavigating ? "opacity-70 ring-2 ring-primary/30" : ""}
        ${draft ? "opacity-50 border-dashed" : ""}
        ${app.status === "Offer" ? "border-l-[3px] border-l-emerald-500" : ""}
      `}
    >
      {/* Company + status badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-text-primary">
          {app.company_name ?? "Company TBD"}
        </p>
        {draft ? (
          <span className="text-[12px] font-medium px-[10px] py-[2px] rounded-full shrink-0 bg-[#F3F4F6] text-[#6B7280]">
            Draft
          </span>
        ) : app.status === "Offer" ? (
          <span className="text-[12px] font-medium px-3 py-1 rounded-full shrink-0 bg-[#ECFDF5] text-[#065F46]">
            ✓ Offer
          </span>
        ) : (
          <span
            className={`text-[12px] font-medium px-[10px] py-[2px] rounded-full shrink-0 ${STATUS_STYLE[app.status] ?? "bg-[#F3F4F6] text-[#6B7280]"}`}
          >
            {app.status}
          </span>
        )}
      </div>

      {/* Role + score inline */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-text-secondary">
          {app.role_title ?? "Role TBD"}
        </p>
        {app.match_score !== null ? (
          <span
            className={`text-[12px] font-semibold px-[10px] py-[2px] rounded-full ${matchScoreStyle(app.match_score)}`}
          >
            {app.match_score}% match
          </span>
        ) : !draft ? (
          <span className="text-[12px] font-medium px-[10px] py-[2px] rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
            Score pending
          </span>
        ) : null}
      </div>

      <p className="text-xs text-slate-400">{date}</p>
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="card p-10 text-center space-y-4">
      <div className="text-4xl">🚀</div>
      <div className="space-y-1">
        <p className="font-semibold text-text-primary">
          Your launchpad is ready.
        </p>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          Track your applications, log every stage, and get ATS suggestions to
          improve your chances.
        </p>
      </div>
      <button onClick={onStart} className="btn-primary mx-auto">
        Start your first application →
      </button>
    </div>
  );
}
