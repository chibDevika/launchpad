"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, ExtendedProfile, ResumeJSON } from "@/lib/types";

interface Props {
  profile: UserProfile;
}

const QUESTIONS: { key: keyof ExtendedProfile; label: string }[] = [
  {
    key: "q1",
    label: "What's your proudest achievement that isn't on your resume?",
  },
  {
    key: "q2",
    label: "In your last role, what did you actually own end-to-end?",
  },
  {
    key: "q3",
    label:
      "What skills or tools have you used regularly that don't show up on your resume?",
  },
  {
    key: "q4",
    label: "What kind of work do you want more of in your next role?",
  },
  {
    key: "q5",
    label:
      "Is there anything about your career path that a resume doesn't explain well — a gap, a pivot, an unconventional move?",
  },
];

const EMPTY_EP: ExtendedProfile = { q1: "", q2: "", q3: "", q4: "", q5: "" };

export default function ProfileClient({ profile }: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  function navigate(path: string, key: string) {
    setNavigating(key);
    router.push(path);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
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
              onClick={() => navigate("/tracker", "tracker")}
              disabled={navigating !== null}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {navigating === "tracker" ? "Loading…" : "Tracker"}
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

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">Your profile</h1>
          <p className="text-text-secondary text-sm">
            This is what Launchpad knows about you. The more complete this is,
            the better your resumes and cover letters.
          </p>
        </div>

        <ResumeSection profile={profile} />
        <ExtendedProfileSection profile={profile} />
      </main>
    </div>
  );
}

function ResumeSection({ profile }: { profile: UserProfile }) {
  const [status, setStatus] = useState<"idle" | "parsing" | "saving">("idle");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadedAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  async function handleFile(file: File) {
    setStatus("parsing");
    setError(null);
    setSaved(false);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const parseRes = await fetch("/api/parse-resume", {
        method: "POST",
        body: fd,
      });
      const parsed = await parseRes.json();
      if (!parseRes.ok) throw new Error(parsed.error ?? "Parse failed");

      const resume: ResumeJSON = parsed.resume;

      setStatus("saving");
      const saveRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_resume: resume }),
      });
      if (!saveRes.ok) throw new Error("Save failed");

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="font-semibold text-text-primary">Base resume</h2>
          {profile.base_resume && uploadedAt && (
            <p className="text-sm text-text-secondary">
              {profile.full_name ?? "Your name"},{" "}
              {profile.current_role_title ?? "current role"} — uploaded{" "}
              {uploadedAt}
            </p>
          )}
          {!profile.base_resume && (
            <p className="text-sm text-text-secondary">
              No resume uploaded yet.
            </p>
          )}
        </div>
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">Saved</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={status !== "idle"}
        className="btn-ghost text-sm disabled:opacity-50"
      >
        {status === "parsing"
          ? "Reading resume…"
          : status === "saving"
            ? "Saving…"
            : "Update resume"}
      </button>
    </section>
  );
}

function ExtendedProfileSection({ profile }: { profile: UserProfile }) {
  const [answers, setAnswers] = useState<ExtendedProfile>(
    profile.extended_profile ?? EMPTY_EP,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<keyof ExtendedProfile | null>(
    null,
  );
  const [transcribing, setTranscribing] = useState<
    keyof ExtendedProfile | null
  >(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function setAnswer(key: keyof ExtendedProfile, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setSaved(false);
  }

  async function startRecording(key: keyof ExtendedProfile) {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(key);
        setRecording(null);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/sarvam-stt", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const { transcript } = await res.json();
            if (transcript) setAnswer(key, transcript);
          }
        } finally {
          setTranscribing(null);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(key);
    } catch {
      // mic not available — silent fail
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extended_profile: answers }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="font-semibold text-text-primary">About you</h2>
        </div>
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">Saved</span>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        Tell us what your resume doesn&apos;t. These answers make your tailored
        resumes and cover letters significantly better.
      </p>

      <div className="space-y-5">
        {QUESTIONS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-text-primary leading-snug">
              {label}
            </label>
            <div className="relative">
              <textarea
                className="input w-full min-h-[88px] resize-none pr-12 text-sm"
                value={answers[key]}
                onChange={(e) => setAnswer(key, e.target.value)}
                disabled={recording === key || transcribing === key}
              />
              <button
                type="button"
                title={
                  recording === key ? "Stop recording" : "Click to dictate"
                }
                onClick={() =>
                  recording === key ? stopRecording() : startRecording(key)
                }
                disabled={
                  (recording !== null && recording !== key) ||
                  transcribing !== null
                }
                className={`absolute right-2.5 top-2.5 w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                  recording === key
                    ? "bg-red-500 text-white"
                    : transcribing === key
                      ? "bg-slate-200 text-slate-400"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {transcribing === key ? (
                  <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MicIcon active={recording === key} />
                )}
                {recording === key && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </section>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
