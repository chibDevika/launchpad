import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ATSSuggestion } from "@/lib/types";

const anthropic = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: app } = await supabase
    .from("applications")
    .select("user_id, jd_extracted")
    .eq("id", id)
    .single();
  if (!app || app.user_id !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("users")
    .select("base_resume, extended_profile")
    .eq("id", user.id)
    .single();

  const body = await request.json();
  const suggestion: ATSSuggestion = body.suggestion;
  const messages: ChatMessage[] = body.messages ?? [];

  if (!suggestion || messages.length === 0)
    return NextResponse.json(
      { error: "Missing suggestion or messages" },
      { status: 400 },
    );

  const suggestionContext = `Suggestion being discussed:
- What: ${suggestion.what}
- Where: ${suggestion.location}
- Why: ${suggestion.reason}
- Priority: ${suggestion.priority}
- Replace this: ${suggestion.replace_this ?? "None (pure addition)"}
- With this: ${suggestion.with_this}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: `You are a career coach helping a job seeker refine an ATS resume suggestion. Be concise, practical, and friendly.

${suggestionContext}

${app.jd_extracted ? `<jd_extracted>${JSON.stringify(app.jd_extracted)}</jd_extracted>` : ""}
${profile?.base_resume ? `<resume>${JSON.stringify(profile.base_resume)}</resume>` : ""}
${profile?.extended_profile ? `<extended_profile>${JSON.stringify(profile.extended_profile)}</extended_profile>` : ""}

Answer questions like: is this keyword really necessary, can you rephrase this differently, is this change ATS-critical or just nice-to-have. Keep answers short and actionable.

If <extended_profile> is present, use it to offer more personalised alternatives — if the candidate mentioned relevant experience or skills there that aren't in the resume, suggest incorporating that specific detail rather than a generic rewrite.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply });
}
