"use client";

import { useState, useEffect } from "react";

interface StepResult {
  target_roles: string[];
  work_preference: string[];
}

interface Props {
  currentRole: string;
  onNext: (data: StepResult) => void;
  onBack: () => void;
  loading: boolean;
}

const WORK_OPTIONS = ["Remote", "Hybrid", "On-site"];

export function StepTargetRole({
  currentRole,
  onNext,
  onBack,
  loading,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [workPref, setWorkPref] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/suggest-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentRole }),
    })
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [currentRole]);

  function toggleRole(role: string) {
    setSelected((s) =>
      s.includes(role) ? s.filter((r) => r !== role) : [...s, role],
    );
  }

  function toggleWork(pref: string) {
    setWorkPref((s) =>
      s.includes(pref) ? s.filter((p) => p !== pref) : [...s, pref],
    );
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    setSelected((s) => [...s, trimmed]);
    setCustom("");
  }

  const canContinue = selected.length > 0 && workPref.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">
          What&apos;s next for you?
        </h2>
        <p className="text-text-secondary text-sm">
          Pick the roles you&apos;re targeting. We&apos;ll use these to score
          your job matches.
        </p>
      </div>

      {/* Role suggestions */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-primary">Target roles</p>

        {loadingSuggestions ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-28 rounded-full bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((role) => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  selected.includes(role)
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-slate-200 text-text-primary hover:border-primary hover:text-primary"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}

        {/* Custom role input */}
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Add your own role…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <button
            onClick={addCustom}
            disabled={!custom.trim()}
            className="btn-ghost px-3 disabled:opacity-40"
          >
            + Add
          </button>
        </div>

        {/* Selected roles */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {selected.map((role) => (
              <span
                key={role}
                className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1.5"
              >
                {role}
                <button
                  onClick={() => toggleRole(role)}
                  className="opacity-60 hover:opacity-100 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Work preference */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-text-primary">
          Work preference
          <span className="text-text-secondary font-normal ml-1.5">
            — used as a hard filter when scoring roles
          </span>
        </p>
        <div className="flex gap-2">
          {WORK_OPTIONS.map((pref) => (
            <button
              key={pref}
              onClick={() => toggleWork(pref)}
              className={`flex-1 py-2.5 rounded-input border text-sm font-medium transition-colors ${
                workPref.includes(pref)
                  ? "bg-primary text-white border-primary"
                  : "bg-surface border-slate-200 text-text-primary hover:border-primary hover:text-primary"
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="btn-ghost flex-1"
        >
          ← Back
        </button>
        <button
          onClick={() =>
            onNext({ target_roles: selected, work_preference: workPref })
          }
          disabled={!canContinue || loading}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {loading ? "Setting things up…" : "We've got this →"}
        </button>
      </div>
    </div>
  );
}
