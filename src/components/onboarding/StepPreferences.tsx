"use client";

import { useState } from "react";
import type { TonePreference } from "@/lib/types";

interface Preferences {
  tone_preference: TonePreference;
  industries_of_interest: string;
}

interface Props {
  onNext: (data: Preferences) => void;
  onBack: () => void;
  loading: boolean;
}

const TONE_OPTIONS: { value: TonePreference; label: string; desc: string }[] = [
  {
    value: "formal",
    label: "Formal",
    desc: "Polished and professional — great for finance, law, consulting",
  },
  {
    value: "balanced",
    label: "Balanced",
    desc: "Clear and confident — works everywhere",
  },
  {
    value: "conversational",
    label: "Conversational",
    desc: "Direct and human — perfect for startups and creative roles",
  },
];

export function StepPreferences({ onNext, onBack, loading }: Props) {
  const [form, setForm] = useState<Preferences>({
    tone_preference: "balanced",
    industries_of_interest: "",
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">One last thing</h2>
        <p className="text-text-secondary">
          How do you want to come across on paper?
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-primary">
          Writing tone
        </label>
        {TONE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              setForm((f) => ({ ...f, tone_preference: opt.value }))
            }
            className={`w-full text-left p-4 rounded-card border-2 transition-colors ${
              form.tone_preference === opt.value
                ? "border-primary bg-blue-50"
                : "border-slate-200 bg-surface hover:border-slate-300"
            }`}
          >
            <p className="font-medium text-text-primary">{opt.label}</p>
            <p className="text-sm text-text-secondary">{opt.desc}</p>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="industries"
          className="block text-sm font-medium text-text-primary"
        >
          Industries you&apos;re interested in
        </label>
        <p className="text-xs text-text-secondary">
          Optional — helps us give smarter suggestions
        </p>
        <input
          id="industries"
          type="text"
          placeholder="Fintech, Climate, B2B SaaS"
          value={form.industries_of_interest}
          onChange={(e) =>
            setForm((f) => ({ ...f, industries_of_interest: e.target.value }))
          }
          className="input"
        />
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
          onClick={() => onNext(form)}
          disabled={loading}
          className="btn-primary flex-1"
        >
          {loading ? "Setting things up…" : "We've got this →"}
        </button>
      </div>
    </div>
  );
}
