"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type {
  Application,
  ApplicationStage,
  ATSSuggestion,
  ATSPriority,
  JDExtracted,
  MatchBreakdown,
  UserStatusBucket,
} from "@/lib/types";

interface Props {
  application: Application;
  initialStages: ApplicationStage[];
  buckets: UserStatusBucket[];
}

const CHANNEL_OPTIONS = [
  "LinkedIn",
  "Job portal",
  "Company website",
  "Referral",
  "Recruiter reached out",
  "Cold outreach",
  "Other",
];

const CHAT_STARTERS_PRE = [
  "What makes a strong application for this type of role?",
];

const CHAT_STARTERS_POST = [
  "Generate a resume variant for this role",
  "Write a cover letter for this role",
  "Why are you a good fit for this role?",
  "What salary should you quote?",
  "What's your strongest talking point for this company?",
  "Help me answer: what motivates you to join us?",
];

const PRIORITY_STYLE: Record<ATSPriority, { badge: string }> = {
  High: { badge: "bg-amber-50 text-amber-700" },
  Medium: { badge: "bg-[#EEF2FF] text-[#4338CA]" },
  Low: { badge: "bg-slate-100 text-slate-500" },
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readStoredWidth(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = Number(localStorage.getItem(key));
  return v > 0 ? v : fallback;
}

// ─── WorkspaceClient ──────────────────────────────────────────────────────────

export default function WorkspaceClient({
  application: initialApp,
  initialStages,
  buckets,
}: Props) {
  const router = useRouter();
  const [app, setApp] = useState<Application>(initialApp);
  const [stages, setStages] = useState<ApplicationStage[]>(initialStages);

  // ── Panel widths ────────────────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(() =>
    readStoredWidth("lp_left_width", 340),
  );
  const [chatPanelWidth, setChatPanelWidth] = useState(() =>
    readStoredWidth("lp_chat_width", 360),
  );
  const [chatOpen, setChatOpen] = useState(false);

  const dragging = useRef<"left" | "chat" | null>(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);
  const leftWidthRef = useRef(leftWidth);
  const chatPanelWidthRef = useRef(chatPanelWidth);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = e.clientX - dragStartX.current;
      if (dragging.current === "left") {
        const w = Math.max(240, Math.min(520, dragStartW.current + delta));
        setLeftWidth(w);
        leftWidthRef.current = w;
      } else {
        // chat handle is on the left edge — dragging left widens the panel
        const w = Math.max(280, Math.min(640, dragStartW.current - delta));
        setChatPanelWidth(w);
        chatPanelWidthRef.current = w;
      }
    }
    function onUp() {
      if (dragging.current === "left") {
        localStorage.setItem("lp_left_width", String(leftWidthRef.current));
      } else if (dragging.current === "chat") {
        localStorage.setItem(
          "lp_chat_width",
          String(chatPanelWidthRef.current),
        );
      }
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(
    e: { clientX: number; preventDefault: () => void },
    currentW: number,
  ) {
    e.preventDefault();
    dragging.current = "left";
    dragStartX.current = e.clientX;
    dragStartW.current = currentW;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function startChatDrag(e: { clientX: number; preventDefault: () => void }) {
    e.preventDefault();
    dragging.current = "chat";
    dragStartX.current = e.clientX;
    dragStartW.current = chatPanelWidthRef.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // ── JD analysis ─────────────────────────────────────────────────────────────
  const [jdText, setJdText] = useState(initialApp.jd_raw ?? "");
  const [analysingStep, setAnalysingStep] = useState<
    null | "extracting" | "scoring" | "suggesting"
  >(null);
  const [atsSuggestions, setAtsSuggestions] = useState<ATSSuggestion[]>([]);
  const [doneSuggestions, setDoneSuggestions] = useState<Set<number>>(
    new Set(),
  );

  // ── Tags / notes ─────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState(initialApp.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // ── Custom channel ───────────────────────────────────────────────────────────
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customChannelInput, setCustomChannelInput] = useState("");

  // ── Latest stage notes ───────────────────────────────────────────────────────
  const latestStage = stages.length > 0 ? stages[stages.length - 1] : null;
  const [latestStageNotes, setLatestStageNotes] = useState(
    latestStage?.notes ?? "",
  );
  const [latestStageNotesSaving, setLatestStageNotesSaving] = useState(false);

  useEffect(() => {
    const latest = stages.length > 0 ? stages[stages.length - 1] : null;
    setLatestStageNotes(latest?.notes ?? "");
  }, [stages]);

  // ── Patch helpers ────────────────────────────────────────────────────────────

  function optimisticPatch(fields: Partial<Application>) {
    setApp((a) => ({ ...a, ...fields }));
    fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(console.error);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleStatusChange(status: string) {
    setApp((a) => ({ ...a, status }));
    const today = new Date().toISOString().slice(0, 10);
    const [, stageRes] = await Promise.all([
      fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
      fetch(`/api/applications/${app.id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_name: status, stage_date: today }),
      }),
    ]);
    const { stage } = await stageRes.json();
    if (stage) {
      setStages((prev) =>
        [...prev, stage].sort(
          (a, b) =>
            new Date(a.stage_date).getTime() - new Date(b.stage_date).getTime(),
        ),
      );
    }
  }

  async function handleAnalyseJD() {
    if (!jdText.trim() || analysingStep) return;

    setAnalysingStep("extracting");
    try {
      const extractRes = await fetch(`/api/applications/${app.id}/extract-jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });
      const { jdExtracted } = await extractRes.json();
      setApp((a) => ({
        ...a,
        jd_raw: jdText,
        jd_extracted: jdExtracted,
        company_name: a.company_name || jdExtracted.company || a.company_name,
        role_title: a.role_title || jdExtracted.role_title || a.role_title,
      }));

      setAnalysingStep("scoring");
      const matchRes = await fetch(`/api/applications/${app.id}/match-score`, {
        method: "POST",
      });
      const { matchBreakdown } = await matchRes.json();
      setApp((a) => ({
        ...a,
        match_score: matchBreakdown.score,
        match_breakdown: matchBreakdown,
      }));

      setAnalysingStep("suggesting");
      const atsRes = await fetch(
        `/api/applications/${app.id}/ats-suggestions`,
        { method: "POST" },
      );
      const { suggestions } = await atsRes.json();
      setAtsSuggestions(suggestions ?? []);
      setDoneSuggestions(new Set());
    } finally {
      setAnalysingStep(null);
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setApp((a) => ({ ...a, notes }));
    setNotesSaving(false);
  }

  function toggleChannel(channel: string) {
    const updated = app.channels.includes(channel)
      ? app.channels.filter((c) => c !== channel)
      : [...app.channels, channel];
    optimisticPatch({ channels: updated });
  }

  function addCustomChannel(e: { key: string }) {
    if (e.key !== "Enter") return;
    const ch = customChannelInput.trim();
    if (!ch) {
      setCustomChannelInput("");
      setShowCustomInput(false);
      return;
    }
    if (!app.channels.includes(ch)) {
      optimisticPatch({ channels: [...app.channels, ch] });
    }
    setCustomChannelInput("");
    setShowCustomInput(false);
  }

  function addTag(e: { key: string }) {
    if (e.key !== "Enter") return;
    const tag = tagInput.trim();
    if (!tag || app.custom_tags.includes(tag)) {
      setTagInput("");
      return;
    }
    optimisticPatch({ custom_tags: [...app.custom_tags, tag] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    optimisticPatch({ custom_tags: app.custom_tags.filter((t) => t !== tag) });
  }

  async function saveLatestStageNotes() {
    if (!latestStage) return;
    setLatestStageNotesSaving(true);
    await fetch(`/api/applications/${app.id}/stages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage_id: latestStage.id,
        notes: latestStageNotes,
      }),
    });
    setStages((prev) =>
      prev.map((s) =>
        s.id === latestStage.id ? { ...s, notes: latestStageNotes } : s,
      ),
    );
    setLatestStageNotesSaving(false);
  }

  const handleToggleDone = useCallback((idx: number) => {
    setDoneSuggestions((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const jdAnalysed = !!app.jd_extracted;
  const matchReady = jdAnalysed && app.match_score !== null;
  const indexedSuggestions = atsSuggestions.map((suggestion, idx) => ({
    suggestion,
    idx,
  }));
  const activeSuggestions = indexedSuggestions.filter(
    ({ idx }) => !doneSuggestions.has(idx),
  );
  const completedSuggestions = indexedSuggestions.filter(({ idx }) =>
    doneSuggestions.has(idx),
  );
  const customChannels = app.channels.filter(
    (ch) => !CHANNEL_OPTIONS.includes(ch),
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <WorkspaceHeader
        app={app}
        buckets={buckets}
        onBack={() => router.push("/tracker")}
        onStatusChange={handleStatusChange}
        onNavigate={(path) => router.push(path)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Left panel ────────────────────────────────────────────────────── */}
        <div
          style={{ width: leftWidth }}
          className="shrink-0 border-r border-slate-100 overflow-y-auto p-5 space-y-6"
        >
          {/* Channels */}
          <section className="space-y-2">
            <h3 className="section-label">Channels</h3>
            <p className="text-xs text-slate-400">
              How did you find or engage with this role?
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                    app.channels.includes(ch)
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-slate-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {app.channels.includes(ch) ? "✓ " : ""}
                  {ch}
                </button>
              ))}
              {customChannels.map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium border transition-colors bg-primary text-white border-primary"
                >
                  ✓ {ch}
                </button>
              ))}
              {showCustomInput ? (
                <input
                  autoFocus
                  className="text-xs px-3 py-1 rounded-full border border-primary outline-none w-32 bg-surface"
                  placeholder="Channel name…"
                  value={customChannelInput}
                  onChange={(e) => setCustomChannelInput(e.target.value)}
                  onKeyDown={addCustomChannel}
                  onBlur={() => {
                    setCustomChannelInput("");
                    setShowCustomInput(false);
                  }}
                />
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="text-xs px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary transition-colors"
                >
                  + Custom
                </button>
              )}
            </div>
          </section>

          {/* Notes — moved above Tags */}
          <section className="space-y-2">
            <h3 className="section-label">Notes</h3>
            <textarea
              className="input resize-none h-28 text-sm leading-relaxed"
              placeholder="Anything worth remembering about this role…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={saveNotes}
              disabled={notesSaving || notes === (app.notes ?? "")}
              className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
            >
              {notesSaving ? "Saving…" : "Save notes"}
            </button>
          </section>

          {/* Tags */}
          <section className="space-y-2">
            <h3 className="section-label">Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {app.custom_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-slate-400 hover:text-slate-700 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              className="input text-sm"
              placeholder="Add tag, press Enter…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
            />
          </section>

          {/* Timeline */}
          <section className="space-y-3">
            <h3 className="section-label">Timeline</h3>
            {stages.length === 0 ? (
              <p className="text-xs text-slate-400">
                Updated automatically as your application moves forward.
              </p>
            ) : (
              <ol className="relative border-l border-[#E5E7EB] ml-1.5 space-y-4">
                {stages.map((s) => (
                  <li key={s.id} className="pl-4">
                    <span className="absolute -left-1.5 w-3 h-3 bg-[#6366F1] rounded-full border-2 border-white" />
                    <p className="text-xs font-semibold text-text-primary">
                      {s.stage_name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(s.stage_date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                    {s.notes && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {s.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {latestStage && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-text-secondary">
                  Add notes to latest stage
                </p>
                <textarea
                  className="input resize-none h-16 text-sm"
                  placeholder="What happened? Who did you speak with?…"
                  value={latestStageNotes}
                  onChange={(e) => setLatestStageNotes(e.target.value)}
                />
                <button
                  onClick={saveLatestStageNotes}
                  disabled={
                    latestStageNotesSaving ||
                    latestStageNotes === (latestStage.notes ?? "")
                  }
                  className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  {latestStageNotesSaving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Left drag handle */}
        <div
          className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 transition-colors select-none"
          onMouseDown={(e) => startDrag(e, leftWidth)}
        />

        {/* ── Centre: JD + ATS ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0">
          {!jdAnalysed ? (
            <JDInput
              value={jdText}
              onChange={setJdText}
              onSubmit={handleAnalyseJD}
              analysingStep={analysingStep}
            />
          ) : (
            <>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setApp((a) => ({
                      ...a,
                      jd_extracted: null,
                      match_score: null,
                      match_breakdown: null,
                    }));
                    setAtsSuggestions([]);
                    setDoneSuggestions(new Set());
                  }}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <span>↺</span> Re-analyse
                </button>
              </div>

              <JDAttributes jd={app.jd_extracted!} />

              {analysingStep === "scoring" && <MatchScoreSkeleton />}
              {matchReady && app.match_breakdown && (
                <MatchScore
                  score={app.match_score!}
                  breakdown={app.match_breakdown as MatchBreakdown}
                />
              )}

              {analysingStep === "suggesting" && <ATSSkeleton />}
              {atsSuggestions.length > 0 && (
                <ATSSuggestions
                  active={activeSuggestions}
                  completed={completedSuggestions}
                  onToggleDone={handleToggleDone}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Floating assistant button ─────────────────────────────────────────── */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          title="Open assistant"
          className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-[#6366F1] text-white flex items-center justify-center shadow-lg hover:bg-[#4F46E5] transition-colors z-40"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* ── Assistant slide-over ──────────────────────────────────────────────── */}
      {chatOpen && (
        <div
          className="fixed inset-y-0 right-0 bg-surface shadow-[-4px_0_24px_rgba(0,0,0,0.08)] z-50 flex flex-row"
          style={{ width: chatPanelWidth }}
        >
          {/* Drag handle on left edge */}
          <div
            className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 transition-colors select-none"
            onMouseDown={(e) => startChatDrag(e)}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <ApplicationChat
              appId={app.id}
              jdAnalysed={jdAnalysed}
              onClose={() => setChatOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WorkspaceHeader ──────────────────────────────────────────────────────────

function WorkspaceHeader({
  app,
  buckets,
  onBack,
  onStatusChange,
  onNavigate,
}: {
  app: Application;
  buckets: UserStatusBucket[];
  onBack: () => void;
  onStatusChange: (s: string) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <header className="bg-surface border-b border-slate-100 px-5 py-3 flex items-center gap-4 shrink-0">
      <button
        onClick={onBack}
        className="text-text-secondary hover:text-text-primary text-sm transition-colors shrink-0"
      >
        ← Tracker
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary truncate text-sm">
          {app.role_title ?? "New Application"}
          {app.company_name && (
            <span className="text-text-secondary font-normal">
              {" "}
              · {app.company_name}
            </span>
          )}
        </p>
      </div>
      <nav className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onNavigate("/dashboard")}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate("/profile")}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Profile
        </button>
      </nav>
      <select
        value={app.status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-[3px] focus:ring-[#EEF2FF] focus:border-[#6366F1] shrink-0"
      >
        {buckets.map((b) => (
          <option key={b.id} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </header>
  );
}

// ─── Application Chat ─────────────────────────────────────────────────────────

const ApplicationChat = memo(function ApplicationChat({
  appId,
  jdAnalysed,
  onClose,
}: {
  appId: string;
  jdAnalysed: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const placeholderIdx = nextMessages.length;

    try {
      const res = await fetch(`/api/applications/${appId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((msgs) => {
            const updated = [...msgs];
            if (updated[placeholderIdx]?.role === "assistant") {
              updated[placeholderIdx] = {
                ...updated[placeholderIdx],
                content: updated[placeholderIdx].content + chunk,
              };
            }
            return updated;
          });
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: {
    key: string;
    shiftKey: boolean;
    preventDefault: () => void;
  }) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const starters = jdAnalysed ? CHAT_STARTERS_POST : CHAT_STARTERS_PRE;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-[#9CA3AF] tracking-[0.05em]">
          Assistant
        </p>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-base leading-none transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-400 text-center pb-1">
              {jdAnalysed
                ? "Ask anything about this application"
                : "Ask anything about this application…"}
            </p>
            <div className="space-y-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-xs bg-slate-50 hover:bg-[#EEF2FF] border border-slate-200 hover:border-[#6366F1]/30 rounded-lg px-3 py-2 text-text-secondary leading-snug transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-text-primary"
                }`}
              >
                {m.content === "" && streaming && i === messages.length - 1 ? (
                  <Spinner />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-2.5 border-t border-slate-100 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            className="input text-sm resize-none flex-1 h-12 leading-relaxed"
            placeholder="Ask anything… (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="btn-primary text-xs px-3 h-12 shrink-0 disabled:opacity-[0.38]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── JD Input ────────────────────────────────────────────────────────────────

function JDInput({
  value,
  onChange,
  onSubmit,
  analysingStep,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  analysingStep: null | "extracting" | "scoring" | "suggesting";
}) {
  const isLoading = !!analysingStep;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  const stepLabel = {
    extracting: "Reading the job description…",
    scoring: "Calculating your match score…",
    suggesting: "Finding ATS gaps…",
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-text-primary text-lg">
          What role are you going for?
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Paste the full job description and we&apos;ll show how you fit — and
          how to make your application stronger.
        </p>
      </div>
      <textarea
        className="input resize-none min-h-[320px] text-sm leading-relaxed"
        placeholder="Paste the full job description here — the more complete, the better your analysis."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      />
      {wordCount > 0 && (
        <p className="text-xs text-slate-400">~{wordCount} words</p>
      )}
      {!wordCount && (
        <p className="text-xs text-slate-400">
          Tip: include the complete job description for the most accurate
          analysis.
        </p>
      )}
      <button
        onClick={onSubmit}
        disabled={!value.trim() || isLoading}
        title={!value.trim() ? "Paste a job description first" : undefined}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Spinner />{" "}
            {stepLabel[analysingStep as keyof typeof stepLabel] ?? "Working…"}
          </>
        ) : (
          "Analyse this role →"
        )}
      </button>
    </div>
  );
}

// ─── JD Attributes ───────────────────────────────────────────────────────────

const JDAttributes = memo(function JDAttributes({ jd }: { jd: JDExtracted }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[22px] font-semibold text-[#111827] leading-snug">
          {jd.role_title}
        </p>
        {jd.company && (
          <p className="text-[15px] font-medium text-[#6366F1] mt-0.5">
            {jd.company}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {jd.location && (
            <span className="text-[12px] bg-[#F3F4F6] text-[#374151] px-2.5 py-0.5 rounded-full">
              {jd.location}
            </span>
          )}
          {jd.seniority && (
            <span className="text-[12px] bg-[#F3F4F6] text-[#374151] px-2.5 py-0.5 rounded-full">
              {jd.seniority}
            </span>
          )}
          {jd.employment_type && (
            <span className="text-[12px] bg-[#F3F4F6] text-[#374151] px-2.5 py-0.5 rounded-full">
              {jd.employment_type}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4 text-sm">
        {jd.required_skills?.length > 0 && (
          <JDRow label="Required skills">
            <div className="flex flex-wrap gap-1.5">
              {jd.required_skills.map((s) => (
                <span
                  key={s}
                  className="text-[12px] bg-[#EEF2FF] text-[#4338CA] px-[10px] py-[3px] rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </JDRow>
        )}
        {jd.tools_technologies?.length > 0 && (
          <JDRow label="Tools & tech">
            <div className="flex flex-wrap gap-1.5">
              {jd.tools_technologies.map((t) => (
                <span
                  key={t}
                  className="text-[12px] bg-[#EEF2FF] text-[#4338CA] px-[10px] py-[3px] rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </JDRow>
        )}
        {jd.nice_to_haves?.length > 0 && (
          <JDRow label="Nice to have">
            <div className="flex flex-wrap gap-1.5">
              {jd.nice_to_haves.map((n) => (
                <span
                  key={n}
                  className="text-[12px] bg-[#F9FAFB] text-[#6B7280] border border-dashed border-[#D1D5DB] px-[10px] py-[3px] rounded-full"
                >
                  {n}
                </span>
              ))}
            </div>
          </JDRow>
        )}
      </div>
    </div>
  );
});

function JDRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <p className="text-xs font-medium text-text-secondary pt-0.5">{label}</p>
      <div>{children}</div>
    </div>
  );
}

// ─── Match Score ─────────────────────────────────────────────────────────────

function MatchScoreSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-20 bg-slate-100 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-1.5 w-full bg-slate-100 rounded-full" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-40 bg-slate-100 rounded" />
        <div className="h-3 w-56 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

const MatchScore = memo(function MatchScore({
  score,
  breakdown,
}: {
  score: number;
  breakdown: MatchBreakdown;
}) {
  const isHigh = score >= 70;
  const isMid = score >= 40;

  const barColor = isHigh ? "bg-emerald-500" : "bg-[#D97706]";
  const scoreColor = isHigh ? "text-emerald-600" : "text-[#854F0B]";
  const scoreLabel = isHigh
    ? "Strong fit"
    : isMid
      ? "Solid foundation"
      : "Worth a swing";

  return (
    <div className="card p-4 space-y-4">
      {/* Score + bar */}
      <div className="flex items-center gap-4">
        <p className={`text-[36px] font-semibold leading-none ${scoreColor}`}>
          {score}%
        </p>
        <div className="flex-1 space-y-1.5">
          <div className="h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className={`text-xs font-medium ${scoreColor}`}>{scoreLabel}</p>
        </div>
      </div>

      {breakdown.strengths?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary">
            What&apos;s working for you
          </p>
          {breakdown.strengths.map((s) => (
            <p key={s} className="text-xs text-emerald-700 flex gap-1.5">
              <span className="mt-0.5 shrink-0">✓</span> {s}
            </p>
          ))}
        </div>
      )}

      {breakdown.gaps?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary">
            Areas to strengthen
          </p>
          {breakdown.gaps.map((g) => (
            <p
              key={g}
              className="text-xs text-[#854F0B] flex gap-1.5 bg-[#FAEEDA] px-2.5 py-1 rounded-lg"
            >
              <span className="mt-0.5 shrink-0">→</span> {g}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── ATS Suggestions ─────────────────────────────────────────────────────────

function ATSSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="h-4 w-32 bg-slate-100 rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

const ATSSuggestions = memo(function ATSSuggestions({
  active,
  completed,
  onToggleDone,
}: {
  active: { suggestion: ATSSuggestion; idx: number }[];
  completed: { suggestion: ATSSuggestion; idx: number }[];
  onToggleDone: (idx: number) => void;
}) {
  return (
    <div className="card p-4 space-y-4">
      <div>
        <p className="font-semibold text-text-primary text-sm">
          ATS suggestions
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          Make these edits yourself — exact before/after copy included.
        </p>
      </div>

      {active.length > 0 && (
        <ul className="space-y-3">
          {active.map(({ suggestion: s, idx }) => (
            <SuggestionCard
              key={idx}
              suggestion={s}
              isDone={false}
              onToggleDone={() => onToggleDone(idx)}
            />
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors list-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform inline-block">
              ›
            </span>
            {completed.length} done
          </summary>
          <ul className="space-y-2 mt-2 opacity-60">
            {completed.map(({ suggestion: s, idx }) => (
              <SuggestionCard
                key={idx}
                suggestion={s}
                isDone={true}
                onToggleDone={() => onToggleDone(idx)}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
});

const SuggestionCard = memo(function SuggestionCard({
  suggestion: s,
  isDone,
  onToggleDone,
}: {
  suggestion: ATSSuggestion;
  isDone: boolean;
  onToggleDone: () => void;
}) {
  const [expanded, setExpanded] = useState(!isDone);
  const p = PRIORITY_STYLE[s.priority] ?? PRIORITY_STYLE.Low;

  return (
    <li className="border border-slate-100 rounded-xl p-3 space-y-2.5">
      {/* Header row */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isDone}
          onChange={onToggleDone}
          className="mt-0.5 shrink-0 accent-primary cursor-pointer"
          title="Mark done"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${p.badge}`}
            >
              {s.priority}
            </span>
            <p
              className={`text-sm font-medium text-text-primary leading-snug ${isDone ? "line-through text-slate-400" : ""}`}
            >
              {s.what}
            </p>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            <span className="font-medium">Where:</span> {s.location}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="font-medium">Why:</span> {s.reason}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 shrink-0 transition-colors pt-0.5"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Diff block */}
      {expanded && (
        <div className="space-y-1.5 ml-6">
          {s.replace_this && s.replace_this !== "None" ? (
            <div className="bg-red-50 rounded px-3 py-2 text-xs text-red-700 font-mono leading-relaxed line-through">
              {s.replace_this}
            </div>
          ) : (
            <div className="bg-slate-50 rounded px-3 py-1.5 text-xs text-slate-400 italic">
              Pure addition — no existing text to remove
            </div>
          )}
          <div className="bg-emerald-50 rounded px-3 py-2 text-xs text-emerald-800 font-mono leading-relaxed">
            <span className="text-emerald-600 font-bold mr-1 not-italic font-sans">
              +
            </span>
            {s.with_this}
          </div>
        </div>
      )}
    </li>
  );
});

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}
