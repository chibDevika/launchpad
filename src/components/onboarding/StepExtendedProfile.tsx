"use client";

import { useState, useRef } from "react";
import type { ExtendedProfile } from "@/lib/types";

interface Props {
  onNext: (data: ExtendedProfile) => void;
  onSkip: () => void;
  onBack: () => void;
  loading: boolean;
}

const QUESTIONS: {
  key: keyof ExtendedProfile;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "q1",
    label:
      "What's something you built, led, or fixed that you're proud of — but it's not on your resume?",
    placeholder:
      "e.g. I rewired our alerting pipeline over a weekend when PagerDuty was waking up the team 10× a night…",
  },
  {
    key: "q2",
    label: "In your last role, what did you actually own end-to-end?",
    placeholder:
      "e.g. I owned the entire checkout flow from API contract to the final pixel — design review, backend, QA, and rollout…",
  },
  {
    key: "q3",
    label:
      "What skills or tools have you used regularly that don't show up on your resume?",
    placeholder:
      "e.g. I've been using dbt and Airbyte daily for 18 months but never bothered adding them…",
  },
  {
    key: "q4",
    label: "What kind of work do you want more of in your next role?",
    placeholder:
      "e.g. More ambiguous 0→1 problems, less steady-state maintenance. I want to be in the room when the architecture decisions get made…",
  },
  {
    key: "q5",
    label:
      "Is there anything about your career path that a resume doesn't explain well — a gap, a pivot, an unconventional move?",
    placeholder:
      "e.g. I left fintech to start a food business. It failed, but I learned more about operations in 18 months than in five years of engineering…",
  },
];

export function StepExtendedProfile({
  onNext,
  onSkip,
  onBack,
  loading,
}: Props) {
  const [answers, setAnswers] = useState<ExtendedProfile>({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
  });
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
      // mic permission denied or not supported — silent fail, text input still works
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }

  const anyFilled = Object.values(answers).some((v) => v.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-text-primary">
          Help us understand you better.
        </h2>
        <p className="text-text-secondary text-sm">
          Your resume only tells part of the story. Fill in the rest so we can
          tailor every application more accurately.
        </p>
      </div>

      <div className="space-y-5">
        {QUESTIONS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-text-primary leading-snug">
              {label}
            </label>
            <div className="relative">
              <textarea
                className="input w-full min-h-[88px] resize-none pr-12 text-sm"
                placeholder={placeholder}
                value={answers[key]}
                onChange={(e) => setAnswer(key, e.target.value)}
                disabled={recording === key || transcribing === key}
              />
              <button
                type="button"
                title={recording === key ? "Stop recording" : "Record answer"}
                onClick={() =>
                  recording === key ? stopRecording() : startRecording(key)
                }
                disabled={
                  (recording !== null && recording !== key) ||
                  transcribing !== null
                }
                className={`absolute right-2.5 top-2.5 w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                  recording === key
                    ? "bg-red-500 text-white animate-pulse"
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
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={loading}
            className="btn-ghost flex-1"
          >
            ← Back
          </button>
          <button
            onClick={() => onNext(answers)}
            disabled={loading || !anyFilled}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? "Setting things up…" : "Finish setup →"}
          </button>
        </div>
        <button
          onClick={onSkip}
          disabled={loading}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors text-center disabled:opacity-50"
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
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
