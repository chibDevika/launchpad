"use client";

import { useState, useRef } from "react";
import type { ResumeJSON } from "@/lib/types";

interface ExtractedProfile {
  full_name: string;
  current_role_title: string;
  current_company: string | null;
  years_of_experience: number;
}

interface StepResult {
  profile: ExtractedProfile;
  resume: ResumeJSON;
}

interface Props {
  onNext: (data: StepResult) => void;
}

type Status = "idle" | "parsing" | "confirming";

export function StepResumeUpload({ onNext }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeJSON | null>(null);
  const [form, setForm] = useState<ExtractedProfile>({
    full_name: "",
    current_role_title: "",
    current_company: "",
    years_of_experience: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setStatus("parsing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");

      setResume(data.resume);
      setForm({
        full_name: data.profile?.full_name ?? "",
        current_role_title: data.profile?.current_role_title ?? "",
        current_company: data.profile?.current_company ?? "",
        years_of_experience: data.profile?.years_of_experience ?? 0,
      });
      setStatus("confirming");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  function field(key: keyof ExtractedProfile) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  if (status === "confirming" && resume) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-text-primary">
            Does this look right?
          </h2>
          <p className="text-text-secondary text-sm">
            We pulled this from your resume. Fix anything that&apos;s off.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="Your name" htmlFor="full_name">
            <input
              id="full_name"
              className="input"
              value={form.full_name}
              onChange={field("full_name")}
            />
          </Field>

          <Field label="Current role" htmlFor="current_role_title">
            <input
              id="current_role_title"
              className="input"
              value={form.current_role_title}
              onChange={field("current_role_title")}
            />
          </Field>

          <Field label="Current company" htmlFor="current_company">
            <input
              id="current_company"
              className="input"
              placeholder="Leave blank if not applicable"
              value={form.current_company ?? ""}
              onChange={field("current_company")}
            />
          </Field>

          <Field label="Years of experience" htmlFor="years_of_experience">
            <input
              id="years_of_experience"
              type="number"
              min={0}
              max={50}
              className="input"
              value={form.years_of_experience}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  years_of_experience: Number(e.target.value),
                }))
              }
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setStatus("idle");
              setError(null);
            }}
            className="btn-ghost flex-1"
          >
            ← Re-upload
          </button>
          <button
            onClick={() =>
              onNext({
                profile: {
                  ...form,
                  current_company: form.current_company || null,
                },
                resume,
              })
            }
            disabled={!form.full_name.trim() || !form.current_role_title.trim()}
            className="btn-primary flex-1"
          >
            Looks good →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">
          Drop in your resume
        </h2>
        <p className="text-text-secondary">
          We&apos;ll read it once and remember the good stuff. PDF or Word,
          either works.
        </p>
      </div>

      <div
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => status === "idle" && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-10 text-center transition-colors ${
          status === "idle"
            ? "border-slate-200 cursor-pointer hover:border-primary hover:bg-blue-50/40"
            : "border-primary bg-blue-50/40 cursor-default"
        }`}
      >
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

        {status === "idle" && (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <p className="font-medium text-text-primary">
              {error ? (
                <span className="text-red-500">{error}</span>
              ) : (
                "Click to upload or drag & drop"
              )}
            </p>
            <p className="text-sm text-text-secondary">
              PDF or DOCX · max 5 MB
            </p>
          </div>
        )}

        {status === "parsing" && (
          <div className="space-y-3">
            <div className="text-4xl animate-pulse">🔍</div>
            <p className="font-medium text-text-primary">
              Reading your resume…
            </p>
            <p className="text-sm text-text-secondary">{fileName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
